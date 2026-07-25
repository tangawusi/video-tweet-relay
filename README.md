# Discord Twitter Video Poster Bot

A highly reliable, production-ready Node.js Discord bot that monitors specified Twitter/X accounts and posts new video or animated GIF tweets to designated Discord channels.

## Key Features
- Gap Prevention: Tracks the last processed tweet ID per user to ensure no tweets are missed.
- Resilient Networking: Exponential backoff retry logic with specific handling for Twitter 429 Rate Limits.
- Manual Control: Admin-only /scrape slash command for on-demand execution.
- Graceful Shutdown: Properly closes database connections and Discord sessions on SIGTERM/SIGINT.
- Startup Validation: Verifies Discord channel accessibility on boot.

## Setup
1. Install dependencies: \`npm install\`
2. Copy environment file: \`cp .env.example .env\`
3. Edit \`.env\` with your actual tokens and mappings.
4. Run: \`npm start\` (or \`npm run dev\` for development)
