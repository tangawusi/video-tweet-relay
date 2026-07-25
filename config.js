import dotenv from 'dotenv';
import logger from './logger.js';

dotenv.config();

let usernameMap = {};
try {
  if (process.env.TWITTER_USERNAME_CHANNEL_MAP) {
    usernameMap = JSON.parse(process.env.TWITTER_USERNAME_CHANNEL_MAP);
  }
} catch (error) {
  logger.error('Failed to parse TWITTER_USERNAME_CHANNEL_MAP. Ensure it is valid JSON.', error);
  process.exit(1);
}

const config = {
  DISCORD_WEBHOOK_URL: process.env.DISCORD_WEBHOOK_URL,
  SCRAPE_INTERVAL: process.env.SCRAPE_INTERVAL || '*/5 * * * *',
  MAX_TWEETS_PER_USER: parseInt(process.env.MAX_TWEETS_PER_USER, 10) || 10,
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  TWITTER_USERNAME_CHANNEL_MAP: usernameMap
};

if (!config.DISCORD_WEBHOOK_URL) {
  logger.error('Missing DISCORD_WEBHOOK_URL. Check .env file.');
  process.exit(1);
}

if (Object.keys(config.TWITTER_USERNAME_CHANNEL_MAP).length === 0) {
  logger.warn('TWITTER_USERNAME_CHANNEL_MAP is empty. No accounts will be monitored.');
}

export default config;