```markdown
# Discord Twitter Video Poster

A lightweight, automated Node.js bot that monitors specified Twitter/X accounts via Nitter RSS and posts new video tweets to a Discord channel using webhooks.

## Features

- **Pure RSS Scraping**: Uses lightweight RSS feeds instead of heavy browser automation.
- **Lazy Evaluation**: Short-circuits polling when no new tweets are found, resulting in near-zero CPU usage during idle periods.
- **SQLite Deduplication**: Guarantees no duplicate posts are sent to Discord.
- **Webhook Integration**: Posts directly via Discord webhooks; no bot tokens or complex permissions required.
- **Resilient**: Automatically falls back to alternative Nitter instances if the primary one fails.

## Prerequisites

- Node.js v18 or higher
- npm

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create your environment file:
   ```bash
   cp .env.example .env
   ```

3. Edit the `.env` file with your specific configuration.

## Configuration

| Variable | Description |
| --- | --- |
| `DISCORD_WEBHOOK_URL` | The webhook URL for your target Discord channel. |
| `TWITTER_USERNAME_CHANNEL_MAP` | A JSON string mapping Twitter usernames to Discord channel IDs (e.g., `{"nasa":"123456789"}`). |
| `SCRAPE_INTERVAL` | Cron expression for the polling interval (e.g., `* * * * *` for every minute). |
| `MAX_TWEETS_PER_USER` | Maximum number of recent tweets to check per run (default: 10). |
| `LOG_LEVEL` | Logging verbosity (`info` or `debug`). |

## Running the Bot

### Development
```bash
npm run dev
```

### Production (Recommended)
Use `pm2` to run the bot in the background and ensure it survives server reboots.

```bash
# Install pm2 globally
sudo npm install -g pm2

# Start the bot
pm2 start index.js --name twitter-video-bot

# Save the process list and configure startup
pm2 save
pm2 startup
```

To view logs, run:
```bash
pm2 logs twitter-video-bot
```
```