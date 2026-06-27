import morgan, { StreamOptions } from 'morgan';
import { Request, Response } from 'express';

// ── Custom JSON log format ────────────────────────────────────────────────────
morgan.token('body-size', (req: Request) => {
  const len = req.headers['content-length'];
  return len ? `${len}b` : '0b';
});

morgan.token('user-id', (req: Request) => {
  const authReq = req as any;
  return authReq.user?.id ?? 'anonymous';
});

morgan.token('org-id', (req: Request) => {
  const authReq = req as any;
  return authReq.user?.orgId ?? '-';
});

const jsonFormat = (tokens: any, req: Request, res: Response): string => {
  const log = {
    ts:         tokens.date(req, res, 'iso'),
    method:     tokens.method(req, res),
    url:        tokens.url(req, res),
    status:     parseInt(tokens.status(req, res) ?? '0', 10),
    ms:         parseFloat(tokens['response-time'](req, res) ?? '0'),
    bytes:      tokens.res(req, res, 'content-length') ?? '0',
    body_size:  tokens['body-size'](req, res),
    user_id:    tokens['user-id'](req, res),
    org_id:     tokens['org-id'](req, res),
    user_agent: tokens['user-agent'](req, res) ?? '-',
    ip:         tokens['remote-addr'](req, res),
  };
  return JSON.stringify(log);
};

const stream: StreamOptions = {
  write: (message: string) => {
    try {
      const log = JSON.parse(message.trim());
      const status = log.status;
      const color  = status >= 500 ? '\x1b[31m'
                   : status >= 400 ? '\x1b[33m'
                   : status >= 300 ? '\x1b[36m'
                   : '\x1b[32m';
      console.log(
        `${color}[http]\x1b[0m ${log.method.padEnd(6)} ${String(log.status)} ${log.url.padEnd(40)} ${log.ms}ms`
      );
    } catch {
      console.log(message.trim());
    }
  },
};

export const httpLogger = morgan(jsonFormat as any, { stream });
