import logger from './logger.js';

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
 * Converts standard Twitter/X URLs to vxtwitter.com.
 * This triggers Discord's native, playable video embed.
 * 
 * @param {string} url - The original tweet URL (e.g., https://x.com/user/status/123)
 * @returns {string} - The rewritten URL (e.g., https://vxtwitter.com/user/status/123)
 */
export function getEmbeddableTwitterUrl(url) {
  try {
    const parsedUrl = new URL(url);
    
    // Replace x.com or twitter.com with vxtwitter.com
    if (parsedUrl.hostname.includes('x.com') || parsedUrl.hostname.includes('twitter.com')) {
      parsedUrl.hostname = 'vxtwitter.com';
    }
    
    return parsedUrl.toString();
  } catch (error) {
    logger.error(`Failed to parse tweet URL, falling back to original: ${error.message}`);
    return url;
  }
}