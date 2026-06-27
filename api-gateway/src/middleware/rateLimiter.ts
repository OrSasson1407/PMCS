import rateLimit from 'express-rate-limit';

// ── General API rate limiter ──────────────────────────────────────────────────
export const generalLimiter = rateLimit({
  windowMs:         15 * 60 * 1000, // 15 minutes
  max:              200,
  standardHeaders:  true,
  legacyHeaders:    false,
  message: {
    error:   'Too many requests',
    message: 'Rate limit exceeded. Try again in 15 minutes.',
    retryAfter: 15 * 60,
  },
});

// ── Auth rate limiter (stricter) ──────────────────────────────────────────────
export const authLimiter = rateLimit({
  windowMs:         15 * 60 * 1000, // 15 minutes
  max:              20,
  standardHeaders:  true,
  legacyHeaders:    false,
  message: {
    error:   'Too many auth attempts',
    message: 'Auth rate limit exceeded. Try again in 15 minutes.',
    retryAfter: 15 * 60,
  },
});

// ── Webhook rate limiter ──────────────────────────────────────────────────────
export const webhookLimiter = rateLimit({
  windowMs:         1 * 60 * 1000, // 1 minute
  max:              30,
  standardHeaders:  true,
  legacyHeaders:    false,
  message: {
    error:   'Too many webhook events',
    message: 'Webhook rate limit exceeded. Try again in 1 minute.',
    retryAfter: 60,
  },
});
