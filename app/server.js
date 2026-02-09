const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const https = require('https');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new sqlite3.Database(path.join(__dirname, 'leaderboard.db'));

// Load GitHub token from config.json (fallback if not set via env)
if (!process.env.GITHUB_TOKEN) {
  try {
    const configPath = path.join(__dirname, '..', 'config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.github_token) {
        process.env.GITHUB_TOKEN = config.github_token;
        console.log('Loaded GitHub token from config.json');
      }
    }
  } catch (e) {
    // Config file missing or invalid — that's fine
  }
}

// Verified publishers - official Pinokio ecosystem maintainers
const VERIFIED_PUBLISHERS = [
  'cocktailpeanut',
  'pinokiofactory',
  'facefusion',
  'pinokiocomputer'
];

// Initialize database with enhanced schema
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS scripts (
    id TEXT PRIMARY KEY,
    name TEXT,
    full_name TEXT,
    description TEXT,
    html_url TEXT,
    stars INTEGER DEFAULT 0,
    forks INTEGER DEFAULT 0,
    owner TEXT,
    owner_avatar TEXT,
    type TEXT,
    topics TEXT,
    updated_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    last_synced TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE INDEX IF NOT EXISTS idx_type ON scripts(type)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_stars ON scripts(stars DESC)`);
});

// Helper: delay between API calls to respect rate limits
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper function to make HTTPS requests (supports GITHUB_TOKEN env var)
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const headers = {
      'User-Agent': 'Pinokio-Leaderboard/2.0',
      'Accept': 'application/vnd.github.v3+json'
    };

    const githubToken = process.env.GITHUB_TOKEN;
    if (githubToken) {
      headers['Authorization'] = `token ${githubToken}`;
    }

    https.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode === 403 || res.statusCode === 429) {
            reject(new Error(parsed.message || 'Rate limited'));
            return;
          }
          resolve(parsed);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// Search GitHub code for repos containing a specific filename
async function searchCodeForRepos(filename) {
  const repos = new Map();
  let page = 1;
  const maxPages = 10;

  while (page <= maxPages) {
    try {
      const url = `https://api.github.com/search/code?q=filename:${filename}&per_page=100&page=${page}`;
      const result = await fetchJSON(url);

      if (!result.items || result.items.length === 0) break;

      for (const item of result.items) {
        if (item.repository && !item.repository.fork) {
          repos.set(item.repository.id.toString(), item.repository);
        }
      }

      console.log(`  [${filename}] page ${page}: ${result.items.length} results, ${repos.size} unique repos so far`);

      if (result.items.length < 100) break;
      page++;
      await delay(6000); // Code search has stricter rate limits
    } catch (err) {
      console.warn(`  [${filename}] page ${page} failed: ${err.message}`);
      break;
    }
  }

  return repos;
}

// Sync scripts from GitHub using topic search + code search
async function syncFromGitHub() {
  console.log('Syncing scripts from GitHub...');

  try {
    // Map of repo id -> full repo object (with stars, forks, topics, etc.)
    const allRepos = new Map();

    // --- Step 1: Topic search (existing, fast, returns full repo details) ---
    console.log('Step 1/4: Searching repos with topic:pinokio...');
    const topicUrl = 'https://api.github.com/search/repositories?q=topic:pinokio&sort=stars&order=desc&per_page=100';
    const topicResult = await fetchJSON(topicUrl);

    if (topicResult.items) {
      for (const repo of topicResult.items) {
        allRepos.set(repo.id.toString(), repo);
      }
      console.log(`  Found ${topicResult.items.length} repos via topic search`);
    }

    // --- Steps 2-4: Code search (requires GitHub token) ---
    let fromCode = 0;
    if (process.env.GITHUB_TOKEN) {
      // --- Step 2: Code search for pinokio.js ---
      await delay(2000);
      console.log('Step 2/4: Searching repos containing pinokio.js...');
      const codeReposJS = await searchCodeForRepos('pinokio.js');

      // --- Step 3: Code search for pinokio.json ---
      await delay(2000);
      console.log('Step 3/4: Searching repos containing pinokio.json...');
      const codeReposJSON = await searchCodeForRepos('pinokio.json');

      // --- Step 4: Fetch full details for repos only found via code search ---
      const newRepoNames = new Map();
      for (const [id, repo] of [...codeReposJS, ...codeReposJSON]) {
        if (!allRepos.has(id.toString())) {
          newRepoNames.set(repo.full_name, repo);
        }
      }

      console.log(`Step 4/4: Fetching details for ${newRepoNames.size} repos found only via code search...`);

      let fetchCount = 0;
      for (const [fullName] of newRepoNames) {
        if (fetchCount > 0 && fetchCount % 10 === 0) {
          await delay(2000);
        }
        try {
          const repoDetails = await fetchJSON(`https://api.github.com/repos/${fullName}`);
          if (repoDetails.id && !repoDetails.fork) {
            allRepos.set(repoDetails.id.toString(), repoDetails);
          }
        } catch (err) {
          console.warn(`  Failed to fetch details for ${fullName}: ${err.message}`);
        }
        fetchCount++;
      }
    } else {
      console.log('Steps 2-4: Skipped (no GITHUB_TOKEN configured — code search requires authentication)');
      console.log('  To enable: click Settings in the sidebar, or create config.json with {"github_token":"ghp_..."}');
    }

    // --- Store all repos in database ---
    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO scripts
      (id, name, full_name, description, html_url, stars, forks, owner, owner_avatar, type, topics, updated_at, last_synced)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    let verified = 0;
    let community = 0;

    for (const [id, repo] of allRepos) {
      const isVerified = VERIFIED_PUBLISHERS.includes(repo.owner.login.toLowerCase());
      const type = isVerified ? 'verified' : 'community';

      insertStmt.run(
        repo.id.toString(),
        repo.name,
        repo.full_name,
        repo.description || '',
        repo.html_url,
        repo.stargazers_count || 0,
        repo.forks_count || 0,
        repo.owner.login,
        repo.owner.avatar_url,
        type,
        JSON.stringify(repo.topics || []),
        repo.updated_at || ''
      );

      if (isVerified) verified++;
      else community++;
    }

    insertStmt.finalize();

    const fromTopic = topicResult.items ? topicResult.items.length : 0;
    fromCode = allRepos.size - fromTopic;
    console.log(`Synced ${allRepos.size} total repos (${fromTopic} from topic, ${fromCode} new from code search, ${verified} verified, ${community} community)`);
    return { success: true, verified, community, total: allRepos.size, fromTopic, fromCode };

  } catch (error) {
    console.error('Sync error:', error);
    return { success: false, error: error.message };
  }
}

// API Routes

// Get leaderboard data
app.get('/api/leaderboard', (req, res) => {
  const { type, limit = 50, search } = req.query;

  let query = 'SELECT * FROM scripts';
  const params = [];
  const conditions = [];

  if (type && (type === 'verified' || type === 'community')) {
    conditions.push('type = ?');
    params.push(type);
  }

  if (search) {
    conditions.push('(name LIKE ? OR description LIKE ? OR owner LIKE ?)');
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY stars DESC LIMIT ?';
  params.push(parseInt(limit));

  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    // Parse topics JSON for each row
    const results = rows.map(row => ({
      ...row,
      topics: row.topics ? JSON.parse(row.topics) : []
    }));

    res.json(results);
  });
});

// Get stats
app.get('/api/stats', (req, res) => {
  db.get(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN type = 'verified' THEN 1 ELSE 0 END) as verified,
      SUM(CASE WHEN type = 'community' THEN 1 ELSE 0 END) as community,
      SUM(stars) as total_stars,
      MAX(last_synced) as last_synced
    FROM scripts
  `, (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(row);
  });
});

// Trigger sync from GitHub
app.post('/api/sync', async (req, res) => {
  const result = await syncFromGitHub();
  res.json(result);
});

// Get verified publishers list
app.get('/api/publishers', (req, res) => {
  res.json(VERIFIED_PUBLISHERS);
});

// Start server
app.listen(port, async () => {
  console.log(`Server running at http://127.0.0.1:${port}`);

  // Check if we need initial sync
  db.get('SELECT COUNT(*) as count FROM scripts', async (err, row) => {
    if (!err && row.count === 0) {
      console.log('Database empty, performing initial sync...');
      await syncFromGitHub();
    }
  });
});
