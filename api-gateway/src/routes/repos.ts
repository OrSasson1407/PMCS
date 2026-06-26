import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth';
import { query } from '../services/db';

const router = Router();

// ── Zod Schema ────────────────────────────────────────────────────────────────
const RegisterBranchSchema = z.object({
  name:          z.string().min(1).max(255),
  latest_commit: z.string().length(40),
});

const RegisterRepoSchema = z.object({
  vcs_id:         z.string().min(1),
  name:           z.string().min(1).max(255),
  default_branch: z.string().optional().default('main'),
});

// ── POST /repos/:repo_id/branches ─────────────────────────────────────────────
router.post('/:repo_id/branches', async (req: AuthenticatedRequest, res: Response) => {
  const { repo_id } = req.params;

  const result = RegisterBranchSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid payload', details: result.error.flatten() });
  }

  const { name, latest_commit } = result.data;

  try {
    // ── Verify repo exists ──────────────────────────────────────────────────
    const repoCheck = await query(
      'SELECT id FROM repositories WHERE id = $1 LIMIT 1',
      [repo_id]
    );

    if (repoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    // ── Upsert branch ───────────────────────────────────────────────────────
    const branchResult = await query(
      `INSERT INTO branches (repo_id, name, latest_commit, last_updated)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (repo_id, name) DO UPDATE
         SET latest_commit = $3,
             last_updated  = NOW(),
             is_merged     = false
       RETURNING id, repo_id, name, latest_commit, last_updated, is_merged`,
      [repo_id, name, latest_commit]
    );

    const branch = branchResult.rows[0];
    console.log(`[repos] Branch registered: ${name} (${branch.id}) in repo ${repo_id}`);

    return res.status(201).json({ branch });

  } catch (err) {
    console.error('[repos] Failed to register branch:', err);
    return res.status(500).json({ error: 'Failed to register branch' });
  }
});

// ── GET /repos/:repo_id/branches ──────────────────────────────────────────────
router.get('/:repo_id/branches', async (req: AuthenticatedRequest, res: Response) => {
  const { repo_id } = req.params;

  try {
    const result = await query(
      `SELECT id, name, latest_commit, last_updated, is_merged
       FROM branches
       WHERE repo_id = $1
       ORDER BY last_updated DESC`,
      [repo_id]
    );

    return res.status(200).json({ branches: result.rows });

  } catch (err) {
    console.error('[repos] Failed to fetch branches:', err);
    return res.status(500).json({ error: 'Failed to fetch branches' });
  }
});

// ── POST /repos (register a new repository) ───────────────────────────────────
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  const result = RegisterRepoSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid payload', details: result.error.flatten() });
  }

  const { vcs_id, name, default_branch } = result.data;

  if (!req.user?.orgId) {
    return res.status(401).json({ error: 'Missing org context in token' });
  }

  try {
    const repoResult = await query(
      `INSERT INTO repositories (org_id, vcs_id, name, default_branch)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (vcs_id) DO UPDATE
         SET name           = $3,
             default_branch = $4
       RETURNING id, org_id, vcs_id, name, default_branch`,
      [req.user.orgId, vcs_id, name, default_branch]
    );

    const repo = repoResult.rows[0];
    console.log(`[repos] Repository registered: ${name} (${repo.id})`);

    return res.status(201).json({ repo });

  } catch (err) {
    console.error('[repos] Failed to register repo:', err);
    return res.status(500).json({ error: 'Failed to register repository' });
  }
});

// ── GET /repos (list repos for org) ──────────────────────────────────────────
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.orgId) {
    return res.status(401).json({ error: 'Missing org context in token' });
  }

  try {
    const result = await query(
      'SELECT id, vcs_id, name, default_branch FROM repositories WHERE org_id = $1 ORDER BY name',
      [req.user.orgId]
    );

    return res.status(200).json({ repos: result.rows });

  } catch (err) {
    console.error('[repos] Failed to list repos:', err);
    return res.status(500).json({ error: 'Failed to list repositories' });
  }
});

export default router;
