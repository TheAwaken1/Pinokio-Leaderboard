# Pinokio Leaderboard

Track the most popular Pinokio scripts from verified publishers and the community. Data is synced live from GitHub repositories tagged with `pinokio`.

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

## Data Source

The leaderboard fetches data from GitHub's search API:
- Query: `topic:pinokio`
- Sorted by: Stars (descending)
- Up to 100 repositories per sync

### Verified Publishers

Scripts from these publishers are marked as "Verified":
- `cocktailpeanut` - Pinokio creator and maintainer
- `pinokiofactory` - Official Pinokio Factory
- `facefusion` - Face manipulation platform
- `pinokiocomputer` - Pinokio Computer official

## API Reference

### Get Leaderboard

```bash
GET /api/leaderboard?type=verified&limit=50&search=comfy
```

Parameters:
- `type` (optional): `verified` or `community`
- `limit` (optional): Number of results (default: 50)
- `search` (optional): Search term

**Response:**
```json
[
  {
    "id": "123456",
    "name": "comfyui.pinokio",
    "full_name": "cocktailpeanut/comfyui.pinokio",
    "description": "A 1-click launcher for ComfyUI",
    "html_url": "https://github.com/cocktailpeanut/comfyui.pinokio",
    "stars": 36,
    "forks": 5,
    "owner": "cocktailpeanut",
    "owner_avatar": "https://avatars.githubusercontent.com/u/...",
    "type": "verified",
    "topics": ["pinokio", "comfyui"],
    "updated_at": "2024-01-15T10:30:00Z"
  }
]
```

### Get Stats

```bash
GET /api/stats
```

**Response:**
```json
{
  "total": 100,
  "verified": 15,
  "community": 85,
  "total_stars": 2500,
  "last_synced": "2024-01-15T10:30:00Z"
}
```

### Sync from GitHub

```bash
POST /api/sync
```

**Response:**
```json
{
  "success": true,
  "verified": 15,
  "community": 85,
  "total": 100
}
```

### JavaScript Example

```javascript
// Fetch all verified scripts
const response = await fetch('/api/leaderboard?type=verified');
const scripts = await response.json();

console.log(`Found ${scripts.length} verified scripts`);
scripts.forEach(s => {
  console.log(`${s.name} by ${s.owner} - ${s.stars} stars`);
});
```

### Python Example

```python
import requests

# Search for TTS scripts
response = requests.get('http://localhost:3000/api/leaderboard', params={
    'search': 'tts',
    'limit': 10
})
scripts = response.json()

for script in scripts:
    print(f"{script['name']}: {script['stars']} stars")
```

### cURL Example

```bash
# Get top 10 community scripts
curl "http://localhost:3000/api/leaderboard?type=community&limit=10"

# Trigger a sync
curl -X POST "http://localhost:3000/api/sync"
```

## Technical Details

- **Backend**: Node.js with Express
- **Database**: SQLite for persistent storage
- **Frontend**: Vanilla JS with Bootstrap 5
- **Styling**: Custom CSS with glass morphism and animations

## Rate Limits

GitHub API has rate limits for unauthenticated requests (60 requests/hour). The sync feature respects these limits by fetching data in batches.

## License

MIT
