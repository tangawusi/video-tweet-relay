import logger from './logger.js';

/**
 * Executes an asynchronous function with exponential backoff retry logic.
 * Handles rate limits dynamically based on tracking response metadata.
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
 * Extracts a Twitter/X Status ID and explicitly constructs a Webhook-compatible 
 * JSON Embed Payload that forces Discord to render a native video engine player.
 * 
 * @param {string} originalText - The raw message content from your application pipeline.
 * @returns {Object|null} - A JSON Object payload to send to the Discord Webhook, or null if no link matches.
 */
export function buildWebhookVideoPayload(originalText) {
  if (!originalText || typeof originalText !== 'string') return null;

  // Regex targeting the unique numerical status ID structure of an X/Twitter URL
  const twitterRegex = /https?:\/\/(?:[a-zA-Z0-9-]+\.)?(?:twitter\.com|x\.com|x\.co)\/[a-zA-Z0-9_]+\/status\/([0-9]+)/i;
  const match = originalText.match(twitterRegex);

  if (!match) return null;

  const tweetId = match[1];
  const videoStreamUrl = `https://vxtwitter.com{tweetId}.mp4`;
  const fallbackPageUrl = `https://vxtwitter.com{tweetId}`;

  // This explicit structure forces the unauthenticated Webhook layout parser to launch a video frame
  return {
    content: originalText.replace(twitterRegex, fallbackPageUrl),
    embeds: [
      {
        title: "🎬 Click to Play Video Close-up",
        url: fallbackPageUrl,
        type: "video", // Overrides default text/link styling
        video: {
          url: videoStreamUrl,
          width: 1280,
          height: 720
        },
        provider: {
          name: "VxTwitter Video Stream",
          url: "https://vxtwitter.com"
        }
      }
    ]
  };
}

/**
 * Dispatches a content payload to a Discord Webhook endpoint securely using retry protection.
 * 
 * @param {string} webhookUrl - The target Discord Webhook URL.
 * @param {string} rawUserText - The raw user input message block to evaluate and distribute.
 */
export async function sendToDiscordWebhook(webhookUrl, rawUserText) {
  const payload = buildWebhookVideoPayload(rawUserText);
  const finalPayload = payload ? payload : { content: rawUserText };

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
    
    logger.info("Video embed successfully delivered to Discord UI layer.");
  } catch (error) {
    logger.error(`Webhook pipeline execution crash: ${error.message}`);
  }
}
