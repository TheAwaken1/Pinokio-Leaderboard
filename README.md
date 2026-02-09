# Pinokio Leaderboard

Track the most popular Pinokio scripts from verified publishers and the community. Data is synced live from GitHub repositories tagged with `pinokio`, and with the following files pinokio.js, and pinokio.json.

## Features

- **Live GitHub Sync**: Fetches real-time data from GitHub's API for repositories tagged with `pinokio`
- **Verified vs Community**: Distinguishes scripts from verified publishers (cocktailpeanut, pinokiofactory, facefusion, pinokiocomputer) from community contributions
- **Search & Filter**: Search scripts by name, description, or author; filter by type
- **Beautiful UI**: Modern dark theme with glass morphism effects, smooth animations, and responsive design
- **Stats Dashboard**: View total scripts, verified/community counts, and total GitHub stars

## How to Use

1. **Install**: Click the Install button to set up dependencies
2. **Start**: Launch the leaderboard server
3. **Sync**: Click "Sync from GitHub" to fetch the latest script data
4. **Browse**: Use tabs to filter between All/Verified/Community scripts
5. **Search**: Type in the search box to find specific scripts

## To Search Pinokio.js and Pinokio.json files You Will Need a Github Token

Step-by-step: Create a basic token (takes ~30 seconds)

Go to → https://github.com/settings/tokens
(or: profile photo → Settings → Developer settings → Personal access tokens → Tokens (classic))
Click Generate new token → Generate new token (classic)
Fill in:
Note: something like My search app token (so you remember what it’s for)
Expiration: choose 30 days, 60 days, or “No expiration” (I recommend setting one for security)
Scopes: leave everything unchecked (this is the “basic” part — it only allows public read access)

Click Generate token at the bottom.
Copy the token immediately (it starts with ghp_).
You will never see it again!

That’s it. Your token is now ready.

## Launch the Pinokio Leaderboard app

1. Once lauched, click on terminal tab and stop
2. You will see a settings tab right next to the "Start" tab, click on it
3. A pop up to enter your Github Token pops up, paste your token and save
4. Relaunch the app and sync

The leaderboard fetches data from GitHub's search API:
- Query: `topic:pinokio, files:pinokio.js & pinokio.json`
- Sorted by: Stars (descending)
- Up to 100 repositories per sync

## Technical Details

- **Backend**: Node.js with Express
- **Database**: SQLite for persistent storage
- **Frontend**: Vanilla JS with Bootstrap 5
- **Styling**: Custom CSS with glass morphism and animations

## Rate Limits

GitHub API has rate limits for unauthenticated requests (60 requests/hour). The sync feature respects these limits by fetching data in batches.

## License

MIT
