import rateLimit from 'express-rate-limit';
import { config } from '../config';

export const loginRateLimiter = rateLimit({
  windowMs: config.rateLimit.loginWindowMs,
  max: config.rateLimit.loginMax,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again later.',
    data: null,
  },
  standardHeaders: true,
  legacyHeaders: false,
});
