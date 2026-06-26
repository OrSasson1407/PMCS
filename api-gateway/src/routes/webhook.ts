import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../services/db';
import { setCache } from '../services/redis';

const router = Router();

const AST_ENGINE_URL = process.env.AST_ENGINE_URL || 'http://ast-engine:50051';

// ── Zod Schema: GitHub Push Event Payload ────────────────────────────────────
const GitHubPushPayloadSchema = z.object({
  ref: z.string(),
  before: z.string().length(40),
  after: z.string().length(40),
  repository: z.object({
    id: z.number(),
    name: z.string(),
  }),
  pusher: z.object({
    name: z.string(),
    email: z.string().email(),
  }),
});

export type GitHubPushPayload = z.infer<typeof GitHubPushPayloadSchema>;

// ── POST /webhooks/github/push ────────────────────────────────────────────────
router.post('/github/push', async (req: Request, res: Response) => {
  const result = GitHubPushPayloadSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      error: 'Invalid payload',
      details: result.error.flatten(),
    });
  }

  const payload = result.data;
  const branch = payload.ref.replace('refs/heads/', '');
  const repoName = payload.repository.name;

  console.log(`[webhook] Push received on branch: ${branch} by ${payload.pusher.name}`);

  // ── Immediately acknowledge the webhook ───────────────────────────────────
  res.status(202).json({
    status: 'accepted',
    message: 'Event queued for AST analysis',
    branch,
    commit: payload.after,
  });

  // ── Process asynchronously after response sent ─────────────────────────────
  setImmediate(async () => {
    try {
      // ── Look up repo by vcs_id ──────────────────────────────────────────
      const repoResult = await query(
        "SELECT id FROM repositories WHERE name = $1 LIMIT 1",
        [repoName]
      );

      if (repoResult.rows.length === 0) {
        console.warn(`[webhook] No repo found for repo name: ${repoName}`);
        return;
      }

      const repoId = repoResult.rows[0].id;

      // ── Upsert the pushed branch ────────────────────────────────────────
      const branchResult = await query(
        `INSERT INTO branches (repo_id, name, latest_commit, last_updated)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (repo_id, name) DO UPDATE
           SET latest_commit = $3, last_updated = NOW(), is_merged = false
         RETURNING id`,
        [repoId, branch, payload.after]
      );

      const branchId = branchResult.rows[0]?.id;
      if (!branchId) return;

      console.log(`[webhook] Branch upserted: ${branch} (${branchId})`);

      // ── Fetch all other active branches to compare against ──────────────
      const otherBranches = await query(
        `SELECT id, name, latest_commit FROM branches
         WHERE repo_id = $1
           AND id != $2
           AND is_merged = false
         LIMIT 10`,
        [repoId, branchId]
      );

      // ── Trigger AST analysis against each active branch ─────────────────
      for (const other of otherBranches.rows) {
        try {
          console.log(`[webhook] Analyzing: ${branch} vs ${other.name}`);

          const engineResponse = await fetch(`${AST_ENGINE_URL}/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              base_commit:   other.latest_commit,
              target_commit: payload.after,
              base_files:    [],
              target_files:  [],
            }),
          });

          if (!engineResponse.ok) {
            console.error(`[webhook] AST engine error for ${other.name}: ${engineResponse.status}`);
            continue;
          }

          const engineResult = await engineResponse.json() as {
            ProbabilityScore: number;
            CriticalFiles:    string[];
          };

          const score = Math.min(Math.max(engineResult.ProbabilityScore ?? 0, 0), 1);
          const clampedScore = score.toFixed(2);

          // ── Persist risk event ────────────────────────────────────────
          const eventResult = await query(
            `INSERT INTO risk_events (branch_a_id, branch_b_id, probability_score, status)
             VALUES ($1, $2, $3, 'OPEN')
             RETURNING id`,
            [branchId, other.id, clampedScore]
          );

          console.log(`[webhook] risk_event saved: ${eventResult.rows[0].id} score=${clampedScore}`);

          // ── Invalidate Redis cache for this repo ──────────────────────
          await setCache(`pmcs:risk:branches:${repoId}`, null, 1);

        } catch (analysisErr) {
          console.error(`[webhook] Analysis failed for ${other.name}:`, analysisErr);
        }
      }

      console.log(`[webhook] Processing complete for branch: ${branch}`);

    } catch (err) {
      console.error('[webhook] Async processing failed:', err);
    }
  });
});

export default router;
