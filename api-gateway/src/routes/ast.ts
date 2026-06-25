import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// ?? Zod Schema: On-Demand AST Analysis Payload ???????????????????????????????
const OnDemandAnalysisSchema = z.object({
  base_commit: z.string().min(7).max(40),
  target_commit: z.string().min(7).max(40),
});

// ?? POST /ast/analyze/ondemand ????????????????????????????????????????????????
router.post('/analyze/ondemand', async (req: AuthenticatedRequest, res: Response) => {
  const result = OnDemandAnalysisSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      error: 'Invalid payload',
      details: result.error.flatten(),
    });
  }

  const { base_commit, target_commit } = result.data;

  try {
    // TODO: Forward request to Go AST Engine via gRPC/HTTP
    // TODO: Return real AST diff tree and semantic conflict array

    console.log(`[ast] On-demand analysis requested: ${base_commit} -> ${target_commit}`);

    // Stub response matching API Spec schema
    return res.status(200).json({
      base_commit,
      target_commit,
      ast_diff_tree: [],
      semantic_conflicts: [],
      message: 'AST engine integration pending',
    });
  } catch (err) {
    console.error('[ast] On-demand analysis failed:', err);
    return res.status(500).json({ error: 'AST analysis failed' });
  }
});

export default router;
