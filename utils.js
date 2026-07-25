import logger from './logger.js';

/**
 * Executes an asynchronous function with exponential backoff retry logic.
 * Handles rate limits dynamically based on headers.
 * 
 * @param {Function} fn - The async function to execute.
 * @param {number} retries - Maximum number of retry attempts.
 * @returns {Promise<any>} - Resolves with the result of the function.
 */
export async function withRetry(fn, retries = 3) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (error) {
      const isRateLimit = error.code === 429 || (error.data && error.data.title === 'Too Many Requests');
      const isRetryable = isRateLimit || error.code >= 500 || error.code === 'ETIMEDOUT' || !error.code;

      if (!isRetryable) {
        logger.error(`Non-retryable error encountered: ${error.message}`);
        throw error;
      }

      // Check if we are out of retries BEFORE calculating delay and sleeping
      if (i === retries) {
        logger.error(`Max retries (${retries}) reached. Giving up.`);
        throw error;
      }

      let delay;
      if (isRateLimit && error.rateLimit) {
        const resetTimeMs = error.rateLimit.reset * 1000;
        delay = Math.max(resetTimeMs - Date.now(), 1000);
        logger.warn(`Rate limit hit. Waiting ${Math.ceil(delay / 1000)}s until reset.`);
      } else {
        delay = Math.min(1000 * Math.pow(2, i), 10000);
        logger.warn(`Retry ${i + 1}/${retries} in ${delay}ms due to: ${error.message}`);
      }

      await new Promise(res => setTimeout(res, delay));
    }
  }
}

/**
 * Converts standard Twitter/X URLs to vxtwitter.com and strips tracking query parameters.
 * This triggers Discord's native, playable video embed rather than a static image file.
 * 
 * @param {string} url - The original tweet URL (e.g., https://x.com)
 * @returns {string} - The rewritten URL (e.g., https://vxtwitter.com)
 */
export function getEmbeddableTwitterUrl(url) {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();
    
    // Check for standard X, Twitter, or shortened domains
    const isTwitter = hostname === 'x.com' || 
                      hostname === 'twitter.com' || 
                      hostname === 'x.co' ||
                      hostname.endsWith('.x.com') || 
                      hostname.endsWith('.twitter.com');
    
    if (isTwitter) {
      // Point to the vxtwitter engine to force actual inline stream components on Discord
      parsedUrl.hostname = 'vxtwitter.com';
      
      // Clear out X's user-tracking telemetry params that break embeds
      parsedUrl.searchParams.delete('s');
      parsedUrl.searchParams.delete('t');
      parsedUrl.searchParams.delete('mx');
    }
    
    return parsedUrl.toString();
  } catch (error) {
    logger.error(`Failed to parse tweet URL, falling back to original: ${error.message}`);
    return url;
  }
}
