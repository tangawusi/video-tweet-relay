import Database from 'better-sqlite3';
import logger from './logger.js';

const db = new Database('bot.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS posted_tweets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tweet_id TEXT UNIQUE NOT NULL,
    posted_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS user_last_tweet (
    user_id TEXT PRIMARY KEY,
    last_tweet_id TEXT NOT NULL
  )
`);

const isTweetPostedStmt = db.prepare('SELECT 1 FROM posted_tweets WHERE tweet_id = ?');
const markTweetPostedStmt = db.prepare('INSERT OR IGNORE INTO posted_tweets (tweet_id) VALUES (?)');
const getLastTweetIdStmt = db.prepare('SELECT last_tweet_id FROM user_last_tweet WHERE user_id = ?');
const setLastTweetIdStmt = db.prepare('INSERT OR REPLACE INTO user_last_tweet (user_id, last_tweet_id) VALUES (?, ?)');

export function isTweetPosted(tweetId) {
  const row = isTweetPostedStmt.get(tweetId);
  return !!row;
}

export function markTweetPosted(tweetId) {
  markTweetPostedStmt.run(tweetId);
}

export function getLastTweetId(userId) {
  const row = getLastTweetIdStmt.get(userId);
  return row ? row.last_tweet_id : undefined;
}

export function setLastTweetId(userId, tweetId) {
  setLastTweetIdStmt.run(userId, tweetId);
}

export function closeDatabase() {
  db.close();
  logger.info('Database closed gracefully.');
}

logger.info('Database initialized successfully.');