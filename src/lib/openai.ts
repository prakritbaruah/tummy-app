import OpenAI from 'openai';
import { logger } from '@/utils/logger';
import { env } from '@/lib/env';

const FILENAME = 'openai.ts';

const apiKey = env.openaiApiKey;

let openaiClient: OpenAI;

/**
 * Initialize and return OpenAI client singleton.
 */
export function getOpenAIClient(): OpenAI {
  if (!apiKey) {
    logger.error(
      FILENAME,
      'getOpenAIClient',
      'OpenAI API key not configured. LLM features will not work.',
    );
    throw new Error('OpenAI API key not configured. LLM features will not work.');
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey,
    });
  }

  return openaiClient;
}