import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// ?? GET /repos/:repo_id/risk/branches ????????????????????????????????????????
router.get('/:repo_id/risk/branches', async (req: AuthenticatedRequest, res: Response) => {
  const { repo_id } = req.params;

  if (!repo_id) {
    return res.status(400).json({ error: 'repo_id is required' });
  }

  try {
    // TODO: Query PostgreSQL for active branches and their risk scores
    // TODO: Pull latest AST comparison results from Redis cache

    // Stub response matching API Spec schema
    const data = [
      {
        branch_name: 'feature-auth',
        risk_score: 0.87,
        overlapping_branches: ['feature-users', 'hotfix-db'],
        critical_files: ['src/services/auth.go'],
      },
    ];

    return res.status(200).json({ data });
  } catch (err) {
    console.error(`[risk] Failed to fetch branch risk for repo ${repo_id}:`, err);
    return res.status(500).json({ error: 'Failed to retrieve risk data' });
  }
});

export default router;
