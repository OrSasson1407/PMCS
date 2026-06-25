import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// ?? Zod Schema: GitHub Push Event Payload ????????????????????????????????????
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

// ?? POST /webhooks/github/push ????????????????????????????????????????????????
router.post('/github/push', (req: Request, res: Response) => {
  const result = GitHubPushPayloadSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      error: 'Invalid payload',
      details: result.error.flatten(),
    });
  }

  const payload = result.data;
  const branch = payload.ref.replace('refs/heads/', '');

  // TODO: Drop validated payload into message queue (Kafka/RabbitMQ)
  console.log(`[webhook] Push received on branch: ${branch} by ${payload.pusher.name}`);

  return res.status(202).json({
    status: 'accepted',
    message: 'Event queued for AST analysis',
    branch,
    commit: payload.after,
  });
});

export default router;
