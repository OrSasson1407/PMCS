import { Request, Response, NextFunction } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';

const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || 'pmcs-webhook-secret-dev';

// ── Verify GitHub webhook signature (X-Hub-Signature-256) ────────────────────
export const verifyGitHubSignature = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const signature = req.headers['x-hub-signature-256'] as string | undefined;

  // ── In dev mode without a secret header, skip verification ───────────────
  if (!signature) {
    if (process.env.NODE_ENV === 'production') {
      res.status(401).json({ error: 'Missing X-Hub-Signature-256 header' });
      return;
    }
    console.warn('[webhook] No signature header — skipping verification in dev mode');
    next();
    return;
  }

  // ── Compute expected HMAC signature ──────────────────────────────────────
  const rawBody = JSON.stringify(req.body);
  const expectedSig = `sha256=${createHmac('sha256', WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex')}`;

  // ── Timing-safe comparison to prevent timing attacks ──────────────────────
  try {
    const sigBuffer      = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSig);

    if (sigBuffer.length !== expectedBuffer.length) {
      res.status(401).json({ error: 'Invalid webhook signature' });
      return;
    }

    if (!timingSafeEqual(sigBuffer, expectedBuffer)) {
      res.status(401).json({ error: 'Invalid webhook signature' });
      return;
    }
  } catch {
    res.status(401).json({ error: 'Signature verification failed' });
    return;
  }

  console.log('[webhook] Signature verified successfully');
  next();
};
