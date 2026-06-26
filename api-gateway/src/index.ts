import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { authenticate } from './middleware/auth';
import webhookRouter from './routes/webhook';
import riskRouter from './routes/risk';
import astRouter from './routes/ast';
import authRouter from './routes/auth';
import reposRouter from './routes/repos';
import { checkDbConnection } from './services/db';
import { checkRedisConnection } from './services/redis';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Public routes
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'pmcs-api-gateway',
    timestamp: new Date().toISOString(),
  });
});

// Auth routes (public)
app.use('/auth', authRouter);

// Protected routes
app.use('/webhooks', authenticate, webhookRouter);
app.use('/repos', authenticate, reposRouter);
app.use('/repos', authenticate, riskRouter);
app.use('/ast', authenticate, astRouter);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const bootstrap = async (): Promise<void> => {
  try {
    await checkDbConnection();
    await checkRedisConnection();
    app.listen(PORT, () => {
      console.log(`[api-gateway] Running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('[api-gateway] Failed to connect to data layer:', err);
    process.exit(1);
  }
};

bootstrap();

export default app;
