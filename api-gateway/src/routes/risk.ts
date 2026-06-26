import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { query } from '../services/db';
import { getCache, setCache } from '../services/redis';

const router = Router();

// ── GET /repos/:repo_id/risk/branches ────────────────────────────────────────
router.get('/:repo_id/risk/branches', async (req: AuthenticatedRequest, res: Response) => {
  const { repo_id } = req.params;

  if (!repo_id) {
    return res.status(400).json({ error: 'repo_id is required' });
  }

  try {
    // ── Check Redis cache first ─────────────────────────────────────────────
    const cacheKey = `pmcs:risk:branches:${repo_id}`;
    const cached = await getCache<object[]>(cacheKey);
    if (cached) {
      return res.status(200).json({ data: cached, source: 'cache' });
    }

    // ── Query PostgreSQL ────────────────────────────────────────────────────
    const result = await query(
      `SELECT
        b.id            AS branch_id,
        b.name          AS branch_name,
        b.latest_commit,
        b.last_updated,
        COALESCE(
          MAX(re.probability_score), 0
        )::float         AS risk_score,
        COUNT(re.id)     AS conflict_count
      FROM branches b
      LEFT JOIN risk_events re
        ON (re.branch_a_id = b.id OR re.branch_b_id = b.id)
        AND re.status = 'OPEN'
      WHERE b.repo_id = $1
        AND b.is_merged = false
      GROUP BY b.id, b.name, b.latest_commit, b.last_updated
      ORDER BY risk_score DESC`,
      [repo_id]
    );

    // ── Shape response to match API Spec ────────────────────────────────────
    const data = result.rows.map((row) => ({
      branch_name:          row.branch_name,
      risk_score:           parseFloat(row.risk_score),
      latest_commit:        row.latest_commit,
      last_updated:         row.last_updated,
      open_conflict_count:  parseInt(row.conflict_count, 10),
      overlapping_branches: [],
      critical_files:       [],
    }));

    // ── Cache for 30 seconds ────────────────────────────────────────────────
    await setCache(cacheKey, data, 30);

    return res.status(200).json({ data, source: 'db' });

  } catch (err) {
    console.error(`[risk] Failed to fetch branch risk for repo ${repo_id}:`, err);
    return res.status(500).json({ error: 'Failed to retrieve risk data' });
  }
});

export default router;
