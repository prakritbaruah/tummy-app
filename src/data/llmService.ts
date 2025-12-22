import { ExtractedDish } from '@/types/foodEntry';
import { getOpenAIClient } from '@/lib/openai';
import { logger } from '@/utils/logger';
import {
  getExtractDishesPrompt,
  getPredictTriggersPrompt,
  MODEL_VERSION,
  PROMPT_VERSION
} from '@/lib/llmPrompts';
import {
  VALID_TRIGGER_NAMES
} from '@/data/trigger';

const FILENAME = 'llmService.ts';


async function callOpenAI(
  prompt: string,
  retryCount = 0,
): Promise<string> {
  const client = getOpenAIClient();
  
  if (!client) {
    throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.');
  }

  try {
    logger.info(FILENAME, 'callOpenAI', 'Calling OpenAI API', { 
      model: MODEL_VERSION, 
      promptLength: prompt.length,
      retryCount 
    });

    const response = await client.chat.completions.create({
      model: MODEL_VERSION,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0, // Deterministic outputs
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('OpenAI API returned empty response');
    }

    logger.info(FILENAME, 'callOpenAI', 'OpenAI API call successful', { 
      responseLength: content.length 
    });

    return content;
  } catch (error: any) {
    logger.error(FILENAME, 'callOpenAI', 'OpenAI API call failed', error);
    throw new Error(`OpenAI API error: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Extract individual dishes from raw food entry text using OpenAI.
 */
export async function llmExtractDishes(rawEntryText: string): Promise<ExtractedDish[]> {
  logger.info(FILENAME, 'llmExtractDishes', 'Extracting dishes', { 
    rawEntryTextLength: rawEntryText.length 
  });

  const prompt = getExtractDishesPrompt(rawEntryText, PROMPT_VERSION);

  try {
    const responseText = await callOpenAI(prompt);
    
    // Parse JSON response
    let parsed: { dishes?: ExtractedDish[] };
    try {
      parsed = JSON.parse(responseText);
    } catch (parseError) {
      logger.error(FILENAME, 'llmExtractDishes', 'Failed to parse JSON response', parseError);
      throw new Error(`Invalid JSON response from OpenAI: ${responseText.substring(0, 200)}`);
    }

    // Validate response structure
    if (!parsed.dishes || !Array.isArray(parsed.dishes)) {
      logger.error(FILENAME, 'llmExtractDishes', 'Invalid response structure', { parsed });
      throw new Error('OpenAI response missing "dishes" array');
    }

    // Validate each dish has required fields
    for (const dish of parsed.dishes) {
      if (!dish.dish_fragment_text || !dish.dish_name_suggestion) {
        logger.error(FILENAME, 'llmExtractDishes', 'Invalid dish structure', { dish });
        throw new Error('OpenAI response dish missing required fields');
      }
    }

    logger.info(FILENAME, 'llmExtractDishes', 'Dishes extracted successfully', { 
      dishCount: parsed.dishes.length 
    });

    return parsed.dishes;
  } catch (error: any) {
    logger.error(FILENAME, 'llmExtractDishes', 'Failed to extract dishes. Returning raw entry text.', { error: error?.message || 'Unknown error' });
    return [
      {
        dish_fragment_text: rawEntryText,
        dish_name_suggestion: rawEntryText,
      },
    ];
  }
}

/**
 * Predict potential food triggers (allergens, intolerances) for a dish using OpenAI.
 * TODO: should return ValidTriggerName[] instead of string[]
 */
export async function llmPredictTriggers(
  dishName: string,
  fragmentText: string,
): Promise<string[]> {
  logger.info(FILENAME, 'llmPredictTriggers', 'Predicting triggers', { 
    dishName, 
    fragmentTextLength: fragmentText.length 
  });

  const prompt = getPredictTriggersPrompt(dishName, fragmentText, PROMPT_VERSION);

  try {
    const responseText = await callOpenAI(prompt);
    
    // Parse JSON response
    let parsed: { triggers?: string[] };
    try {
      parsed = JSON.parse(responseText);
    } catch (parseError) {
      logger.error(FILENAME, 'llmPredictTriggers', 'Failed to parse JSON response', parseError);
      throw new Error(`Invalid JSON response from OpenAI: ${responseText.substring(0, 200)}`);
    }

    // Validate response structure
    if (!parsed.triggers || !Array.isArray(parsed.triggers)) {
      logger.error(FILENAME, 'llmPredictTriggers', 'Invalid response structure', { parsed });
      throw new Error('OpenAI response missing "triggers" array');
    }
    // Validate all triggers are strings
    for (const trigger of parsed.triggers) {
      if (typeof trigger !== 'string') {
        logger.error(FILENAME, 'llmPredictTriggers', 'Invalid trigger type', { trigger });
        throw new Error('OpenAI response contains non-string trigger');
      }
    }

    // Validate trigger names are in the allowed list
    const validTriggers: string[] = [];
    const invalidTriggers: string[] = [];
    
    for (const trigger of parsed.triggers) {
      if (VALID_TRIGGER_NAMES.includes(trigger as any)) {
        validTriggers.push(trigger);
      } else {
        invalidTriggers.push(trigger);
        logger.warn(FILENAME, 'llmPredictTriggers', 'Invalid trigger name from LLM', { 
          trigger,
          validTriggers: VALID_TRIGGER_NAMES 
        });
      }
    }

    if (invalidTriggers.length > 0) {
      logger.warn(FILENAME, 'llmPredictTriggers', 'Filtered out invalid trigger names', { 
        invalidTriggers,
        validTriggers 
      });
    }

    logger.info(FILENAME, 'llmPredictTriggers', 'Triggers predicted successfully', { 
      triggerCount: validTriggers.length,
      triggers: validTriggers,
      filteredCount: invalidTriggers.length
    });

    return validTriggers;
  } catch (error: any) {
    logger.error(FILENAME, 'llmPredictTriggers', 'Failed to predict triggers. Returning empty array with no valid triggers.', error);
    return [];
  }
}



