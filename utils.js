import logger from './logger.js';

/**
 * Executes an asynchronous function with exponential backoff retry logic.
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
      // Points Discord to the vxtwitter API crawler page natively
      parsedUrl.hostname = 'vxtwitter.com';
      
      // Strip everything that causes Discord to drop the video parser wrapper
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
 * Scans text for Twitter links, replaces them, and returns a raw plain text object.
 * NO CUSTOM EMBEDS ALLOWED - Crucial for webhook native video parsing.
 * 
 * @param {string} originalText - The raw message content.
 * @returns {Object} - Plain content webhook payload structure.
 */
export function buildWebhookVideoPayload(originalText) {
  if (!originalText || typeof originalText !== 'string') return { content: originalText };

  const twitterRegex = /https?:\/\/(?:[a-zA-Z0-9-]+\.)?(?:twitter\.com|x\.com|x\.co)\/[a-zA-Z0-9_]+\/status\/[0-9]+(?:\?\S*)?/gi;
  
  const convertedText = originalText.replace(twitterRegex, (matchedUrl) => {
    return getEmbeddableTwitterUrl(matchedUrl);
  });

  // CRUCIAL: Removing the custom embeds property array completely.
  // This allows Discord's native scraper bot to build the HTML5 streaming panel player.
  return {
    content: convertedText
  };
}

/**
 * Dispatches content cleanly to your Webhook URL endpoint.
 */
export async function sendToDiscordWebhook(webhookUrl, rawUserText) {
  const finalPayload = buildWebhookVideoPayload(rawUserText);

  try {
    await withRetry(async () => {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalPayload)
      });

      if (!response.ok) {
        throw new Error(`Discord Webhook responded with status: ${response.status}`);
      }
    });
    
    logger.info("Video raw text embed payload successfully delivered.");
  } catch (error) {
    logger.error(`Webhook pipeline execution crash: ${error.message}`);
  }
}
