import { ChatGroq } from '@langchain/groq';
import { env } from '../../config/env.js';

/**
 * The single place the LLM is configured. Swap providers here later:
 * e.g. `new ChatAnthropic({ model: '...' })` from `@langchain/anthropic`
 * with no other code changes.
 */
export const model = new ChatGroq({
  apiKey: env.GROQ_API_KEY,
  model: env.ASSISTANT_MODEL,
  temperature: 0,
});
