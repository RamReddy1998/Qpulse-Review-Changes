import { config } from '../../config';
import logger from '../../config/logger';
import { AiProvider } from './ai.interface';
import { MockGoogleProvider } from './providers/mock.google.provider';
import { GoogleProvider } from './providers/google.provider';

let providerInstance: AiProvider | null = null;

export function getAiProvider(): AiProvider {
  if (providerInstance) {
    return providerInstance;
  }

  const providerType = config.ai.provider;

  switch (providerType) {
    case 'google': {
      try {
        providerInstance = new GoogleProvider({
          apiKey: config.ai.googleApiKey,
          model: config.ai.googleModel,
          maxRetries: 3,
          timeoutMs: 30000,
        });
        logger.info('Google AI provider initialized');
      } catch (error) {
        logger.warn('Failed to initialize Google AI provider, falling back to mock', {
          error: error instanceof Error ? error.message : 'Unknown',
        });
        providerInstance = new MockGoogleProvider();
      }
      break;
    }
    case 'mock':
    default: {
      providerInstance = new MockGoogleProvider();
      logger.info('Mock AI provider initialized');
      break;
    }
  }

  return providerInstance;
}

export function resetAiProvider(): void {
  providerInstance = null;
}
