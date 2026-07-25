import Parser from 'rss-parser';
import logger from './logger.js';
import { isTweetPosted, setLastTweetId } from './database.js';

const parser = new Parser();

const NITTER_INSTANCES = [
  'https://nitter.net',
  'https://nitter.privacydev.net',
  'https://nitter.lacontrevoie.fr',
  'https://nitter.poast.org'
];

export async function getVideoTweets(username, maxTweets) {
  for (const instance of NITTER_INSTANCES) {
    try {
      const feedUrl = `${instance}/${username}/rss`;
      
      const feed = await parser.parseURL(feedUrl);

      if (!feed.items || feed.items.length === 0) {
        continue;
      }

      const videoTweets = [];
      let newestTweetId = null;

      for (const item of feed.items) {
        const match = item.link ? item.link.match(/\/status\/(\d+)/) : null;
        if (!match) continue;
        
        const tweetId = match[1];
        
        // Track the absolute newest tweet ID, even if it's not a video
        if (!newestTweetId) newestTweetId = tweetId;

        // LAZY SHORT-CIRCUIT: If we've already posted this, 
        // all older tweets in this feed have also been posted. Stop immediately.
        if (isTweetPosted(tweetId)) {
          break; 
        }

        // If we reach here, it's a new tweet. Check if it's a video.
        const textToCheck = (item.content || item.contentSnippet || item.description || '').toLowerCase();
        const link = item.link ? item.link.toLowerCase() : '';
        
        const hasVideo = 
          textToCheck.includes('video') || 
          textToCheck.includes('gif') || 
          link.includes('/video/');

        if (hasVideo) {
          if (videoTweets.length < maxTweets) {
            videoTweets.push({ 
              id: tweetId, 
              url: `https://x.com/${username}/status/${tweetId}` 
            });
          }
        }
      }

      // Always update the pointer to the newest tweet seen, so we don't re-check it next time
      if (newestTweetId) {
        setLastTweetId(username, newestTweetId);
      }

      if (videoTweets.length > 0) {
        logger.info(`Found ${videoTweets.length} new video tweets for ${username}`);
      }
      
      return { videoTweets, newestTweetId };

    } catch (error) {
      logger.warn(`Nitter instance ${instance} failed for ${username}. Trying next...`);
    }
  }

  return { videoTweets: [], newestTweetId: null };
}