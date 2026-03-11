import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'default-access-secret-change-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-in-production',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },

  ai: {
    provider: (process.env.AI_PROVIDER || 'mock') as 'mock' | 'google',
    googleApiKey: process.env.GOOGLE_API_KEY || '',
    googleModel: process.env.GOOGLE_AI_MODEL || 'gemini-1.5-pro',
  },

  rateLimit: {
    loginWindowMs: parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || '900000', 10),
    loginMax: parseInt(process.env.LOGIN_RATE_LIMIT_MAX || '10', 10),
  },
} as const;
