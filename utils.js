import logger from './logger.js';

/**
 * Executes an asynchronous function with exponential backoff retry logic.
 * Handles rate limits dynamically based on headers.
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
 * @param {string} url - The original tweet URL
 * @returns {string} - The rewritten URL
 */
export function getEmbeddableTwitterUrl(url) {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();
    
    const isTwitter = hostname === 'x.com' || 
                      hostname === 'twitter.com' || 
                      hostname === 'x.co' ||
                      hostname.endsWith('.x.com') || 
                      hostname.endsWith('.twitter.com');
    
    if (isTwitter) {
      // Direct routing back to vxtwitter proxy architecture
      parsedUrl.hostname = 'vxtwitter.com';
      
      // Strip everything that causes Discord to fall back to an image block
      parsedUrl.searchParams.delete('s');
      parsedUrl.searchParams.delete('t');
      parsedUrl.searchParams.delete('mx');
      parsedUrl.searchParams.delete('cxt');
    }
    
    return parsedUrl.toString();
  } catch (error) {
    logger.error(`Failed to parse tweet URL, falling back to original: ${error.message}`);
    return url;
  }
}

/**
 * Scans text, extracts all Twitter/X URLs, hardens them for video embedding,
 * and formats them explicitly to bypass Discord's static image fallback wrapper bug.
 * 
 * @param {string} text - The raw chat message content.
 * @returns {string} - The text with rewritten vxtwitter URLs.
 */
export function parseAndReplaceTwitterLinks(text) {
  if (!text || typeof text !== 'string') return text;

  const twitterRegex = /https?:\/\/(?:[a-zA-Z0-9-]+\.)?(?:twitter\.com|x\.com|x\.co)\/[a-zA-Z0-9_]+\/status\/[0-9]+(?:\?\S*)?/gi;

  return text.replace(twitterRegex, (matchedUrl) => {
    const cleanedUrl = getEmbeddableTwitterUrl(matchedUrl);
    
    // HARDENING WORKAROUND: Hide the plain text link in a markdown hyper-text anchor.
    // This forces Discord to initialize the media metadata controller without fallback images.
    return `[🎬 Watch Video](${cleanedUrl})`;
  });
}
