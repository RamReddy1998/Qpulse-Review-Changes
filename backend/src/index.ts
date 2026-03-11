import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config';
import logger from './config/logger';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { AdminService } from './services/admin.service';

const adminService = new AdminService();

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Qpulse API is running',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// API routes
app.use('/api', routes);

// Error handler
app.use(errorHandler);

// Start server
app.listen(config.port, () => {
  logger.info(`Qpulse API server started on port ${config.port}`, {
    environment: config.nodeEnv,
    aiProvider: config.ai.provider,
  });

  // Setup periodic batch cleanup every 24 hours
  setInterval(async () => {
    try {
      const count = await adminService.cleanupExpiredBatches();
      if (count > 0) {
        logger.info(`Periodic cleanup: ${count} expired batches removed`);
      }
    } catch (error) {
      logger.error('Error during periodic batch cleanup:', error);
    }
  }, 24 * 60 * 60 * 1000); // 24 hours
});

export default app;
