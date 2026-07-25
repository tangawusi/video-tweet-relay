import config from './config.js';
import logger from './logger.js';
import { buildWebhookVideoPayload } from './utils.js'; // Keep this payload builder utility
import { getVideoTweets } from './twitter.js';
import { isTweetPosted, markTweetPosted } from './database.js';
import { withRetry } from './utils.js';

export async function runScrape() {
  logger.debug('Running lazy scrape check...');
  let successCount = 0;

  const usernames = Object.keys(config.TWITTER_USERNAME_CHANNEL_MAP);

  for (const username of usernames) {
    try {
      await withRetry(async () => {
        // Fetch new tweets containing video data
        const { videoTweets } = await getVideoTweets(username, config.MAX_TWEETS_PER_USER);

        for (const tweet of videoTweets) {
          // Double-check DB just in case of race conditions
          if (!isTweetPosted(tweet.id)) {
            
            // 1. Generate the message content containing the raw link
            const rawMessageContent = `New video from **${username}**:\n${tweet.url}`;
            
            // 2. FIX: Format the message content using our vxtwitter cleanup utility
            const finalPayload = buildWebhookVideoPayload(rawMessageContent);

            const response = await fetch(config.DISCORD_WEBHOOK_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(finalPayload) // Sends cleansed { content: "..." } plain payload
            });

            if (response.ok) {
              markTweetPosted(tweet.id);
              logger.info(`Posted tweet ${tweet.id} for ${username}`);
              successCount++;
            } else {
              logger.error(`Webhook failed for ${tweet.id}: ${response.status}`);
            }
          }
        }
      });
    } catch (error) {
      logger.error(`Failed to process user ${username}:`, error);
    }
  }
  
  if (successCount > 0) {
    logger.info(`Scrape run completed. Posted ${successCount} new tweets.`);
  }
}
