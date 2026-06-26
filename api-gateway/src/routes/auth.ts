import { Router, Request, Response } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { query } from '../services/db';

const router = Router();

const JWT_SECRET  = process.env.JWT_SECRET  || 'change_me_in_production_please';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '24h';

// ── Zod Schema ────────────────────────────────────────────────────────────────
const LoginSchema = z.object({
  email:    z.string().email(),
  org_name: z.string().min(1),
});

// ── POST /auth/login ──────────────────────────────────────────────────────────
router.post('/login', async (req: Request, res: Response) => {
  const result = LoginSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      error:   'Invalid payload',
      details: result.error.flatten(),
    });
  }

  const { email, org_name } = result.data;

  try {
    // ── Look up org by name ─────────────────────────────────────────────────
    const orgResult = await query(
      `SELECT id, name, risk_tolerance
       FROM organizations
       WHERE name = $1
       LIMIT 1`,
      [org_name]
    );

    if (orgResult.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const org = orgResult.rows[0];

    // ── Issue JWT ───────────────────────────────────────────────────────────
    const payload = {
      id:            email,
      orgId:         org.id,
      email,
      org_name:      org.name,
      risk_tolerance: org.risk_tolerance,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES } as jwt.SignOptions);

    console.log(`[auth] Token issued for ${email} @ ${org.name}`);

    return res.status(200).json({
      token,
      expires_in: JWT_EXPIRES,
      org: {
        id:             org.id,
        name:           org.name,
        risk_tolerance: org.risk_tolerance,
      },
    });

  } catch (err) {
    console.error('[auth] Login failed:', err);
    return res.status(500).json({ error: 'Authentication failed' });
  }
});

// ── GET /auth/verify ──────────────────────────────────────────────────────────
router.get('/verify', async (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return res.status(200).json({ valid: true, payload: decoded });
  } catch {
    return res.status(401).json({ valid: false, error: 'Invalid or expired token' });
  }
});

export default router;
