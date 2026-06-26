import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth';
import { query } from '../services/db';
import { setCache, getCache } from '../services/redis';

const router = Router();

const AST_ENGINE_URL = process.env.AST_ENGINE_URL || 'http://ast-engine:50051';

// ── Zod Schema: On-Demand AST Analysis Payload ───────────────────────────────
const OnDemandAnalysisSchema = z.object({
  base_commit:   z.string().min(7).max(40),
  target_commit: z.string().min(7).max(40),
  base_files:    z.array(z.string()).optional().default([]),
  target_files:  z.array(z.string()).optional().default([]),
  branch_a_id:   z.string().uuid().optional(),
  branch_b_id:   z.string().uuid().optional(),
});

// ── POST /ast/analyze/ondemand ────────────────────────────────────────────────
router.post('/analyze/ondemand', async (req: AuthenticatedRequest, res: Response) => {
  const result = OnDemandAnalysisSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      error:   'Invalid payload',
      details: result.error.flatten(),
    });
  }

  const { base_commit, target_commit, base_files, target_files, branch_a_id, branch_b_id } = result.data;

  // ── Check Redis cache ───────────────────────────────────────────────────────
  const cacheKey = `pmcs:ast:${base_commit}:${target_commit}`;
  const cached = await getCache<object>(cacheKey);
  if (cached) {
    return res.status(200).json({ ...cached, source: 'cache' });
  }

  try {
    // ── Forward to Go AST Engine ────────────────────────────────────────────
    const engineResponse = await fetch(`${AST_ENGINE_URL}/analyze`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ base_commit, target_commit, base_files, target_files }),
    });

    if (!engineResponse.ok) {
      const errText = await engineResponse.text();
      console.error('[ast] Engine returned error:', errText);
      return res.status(502).json({ error: 'AST engine analysis failed', detail: errText });
    }

    const engineResult = await engineResponse.json() as {
      ProbabilityScore:  number;
      ConflictingNodes:  unknown[];
      CriticalFiles:     string[];
      BaseCommit:        string;
      TargetCommit:      string;
    };

    // ── Persist risk_event to PostgreSQL if branch IDs provided ────────────
    let savedEventId: string | null = null;
    if (branch_a_id && branch_b_id) {
      const score = engineResult.ProbabilityScore ?? 0;
      const clampedScore = Math.min(Math.max(score, 0), 1).toFixed(2);

      const insertResult = await query(
        `INSERT INTO risk_events
           (branch_a_id, branch_b_id, probability_score, status)
         VALUES ($1, $2, $3, 'OPEN')
         RETURNING id`,
        [branch_a_id, branch_b_id, clampedScore]
      );
      savedEventId = insertResult.rows[0]?.id ?? null;
      console.log(`[ast] risk_event saved: ${savedEventId} score=${clampedScore}`);
    }

    // ── Shape and cache response ────────────────────────────────────────────
    const response = {
      base_commit,
      target_commit,
      probability_score:  engineResult.ProbabilityScore ?? 0,
      ast_diff_tree:      engineResult.ConflictingNodes ?? [],
      critical_files:     engineResult.CriticalFiles    ?? [],
      risk_event_id:      savedEventId,
      source:             'engine',
    };

    await setCache(cacheKey, response, 300);

    return res.status(200).json(response);

  } catch (err) {
    console.error('[ast] On-demand analysis failed:', err);
    return res.status(500).json({ error: 'AST analysis failed' });
  }
});

export default router;
