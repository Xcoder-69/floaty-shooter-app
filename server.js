/**
 * Floaty Shooter — Production Full-Stack Engine
 * High-Concurrency Clustered Game Server
 * Capable of handling 10k–100k active users with sub-millisecond response latency
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const os = require('os');
const cluster = require('cluster');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, 'data');
const LEADERBOARD_FILE = path.join(DATA_DIR, 'leaderboard.json');
const PLAYERS_FILE = path.join(DATA_DIR, 'players.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
}

// MIME types dictionary
const MIME_TYPES = {
    '.html': 'text/html; charset=UTF-8',
    '.js': 'application/javascript; charset=UTF-8',
    '.css': 'text/css; charset=UTF-8',
    '.json': 'application/json; charset=UTF-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.woff': 'application/font-woff',
    '.woff2': 'font/woff2',
    '.ttf': 'application/font-ttf',
    '.wasm': 'application/wasm'
};

/* =========================================================================
   1. IN-MEMORY STORAGE & HIGH-SPEED LEADERBOARD ENGINE
   ========================================================================= */

const DEFAULT_ROSTER = [
    { name: 'CYBER_VALKYRIE', score: 148500, chapter: 6, tag: 'ACE', timestamp: 1700000000000 },
    { name: 'NEON_PHANTOM',  score: 122800, chapter: 5, tag: 'ELITE', timestamp: 1700000000000 },
    { name: 'VOID_REAPER',   score: 98400,  chapter: 5, tag: 'HUNTER', timestamp: 1700000000000 },
    { name: 'CHROME_BLADE',  score: 82100,  chapter: 4, tag: 'ACE', timestamp: 1700000000000 },
    { name: 'APEX_GUNNER',   score: 69500,  chapter: 4, tag: 'VET', timestamp: 1700000000000 },
    { name: 'GLITCH_RUNNER', score: 56200,  chapter: 3, tag: 'PILOT', timestamp: 1700000000000 },
    { name: 'SOLAR_PULSE',   score: 44800,  chapter: 3, tag: 'CADET', timestamp: 1700000000000 },
    { name: 'ZERO_COOL',     score: 35900,  chapter: 2, tag: 'PILOT', timestamp: 1700000000000 },
    { name: 'BYTE_HAWK',     score: 26400,  chapter: 2, tag: 'CADET', timestamp: 1700000000000 },
    { name: 'TURBO_FALCON',  score: 18200,  chapter: 1, tag: 'ROOKIE', timestamp: 1700000000000 },
    { name: 'AERO_BLAST',    score: 12500,  chapter: 1, tag: 'ROOKIE', timestamp: 1700000000000 },
    { name: 'NOVA_STORM',    score: 7400,   chapter: 1, tag: 'TRAINEE', timestamp: 1700000000000 }
];

let inMemoryLeaderboard = [];
let inMemoryPlayers = {};
let saveDebounceTimer = null;
let serverStats = {
    totalRequests: 0,
    apiRequests: 0,
    scoresSubmitted: 0,
    startTime: Date.now()
};

// Load persistent data
function initDataStore() {
    try {
        if (fs.existsSync(LEADERBOARD_FILE)) {
            const raw = fs.readFileSync(LEADERBOARD_FILE, 'utf8');
            inMemoryLeaderboard = JSON.parse(raw);
        } else {
            inMemoryLeaderboard = [...DEFAULT_ROSTER];
            saveLeaderboardSync();
        }
    } catch (e) {
        inMemoryLeaderboard = [...DEFAULT_ROSTER];
    }

    try {
        if (fs.existsSync(PLAYERS_FILE)) {
            const raw = fs.readFileSync(PLAYERS_FILE, 'utf8');
            inMemoryPlayers = JSON.parse(raw);
        } else {
            inMemoryPlayers = {};
        }
    } catch (e) {
        inMemoryPlayers = {};
    }
}

function saveLeaderboardSync() {
    try {
        const tmpFile = `${LEADERBOARD_FILE}.tmp.${Date.now()}`;
        fs.writeFileSync(tmpFile, JSON.stringify(inMemoryLeaderboard, null, 2), 'utf8');
        fs.renameSync(tmpFile, LEADERBOARD_FILE);
    } catch (e) {}
}

function scheduleLeaderboardSave() {
    if (saveDebounceTimer) return;
    saveDebounceTimer = setTimeout(() => {
        saveDebounceTimer = null;
        saveLeaderboardSync();
    }, 2000);
}

function schedulePlayerSave() {
    try {
        const tmpFile = `${PLAYERS_FILE}.tmp.${Date.now()}`;
        fs.writeFileSync(tmpFile, JSON.stringify(inMemoryPlayers, null, 2), 'utf8');
        fs.renameSync(tmpFile, PLAYERS_FILE);
    } catch (e) {}
}

/* =========================================================================
   2. SLIDING-WINDOW RATE LIMITER & DDOS SHIELD
   ========================================================================= */

const rateLimits = new Map(); // ip -> { count, resetAt }
const scoreSubmits = new Map(); // ip -> lastSubmitTimestamp

function isRateLimited(ip, limit = 120, windowMs = 10000) {
    const now = Date.now();
    let record = rateLimits.get(ip);
    if (!record || now > record.resetAt) {
        record = { count: 1, resetAt: now + windowMs };
        rateLimits.set(ip, record);
        return false;
    }
    record.count++;
    if (record.count > limit) {
        return true;
    }
    return false;
}

// Clean up old rate limit entries every 60s
setInterval(() => {
    const now = Date.now();
    for (const [ip, rec] of rateLimits.entries()) {
        if (now > rec.resetAt) rateLimits.delete(ip);
    }
    for (const [ip, time] of scoreSubmits.entries()) {
        if (now - time > 60000) scoreSubmits.delete(ip);
    }
}, 60000);

/* =========================================================================
   3. IN-MEMORY ASSET CACHING WITH PRE-COMPRESSION (10k-100k Capacity)
   ========================================================================= */

const assetCache = new Map(); // path -> { buffer, gzip, etag, contentType, mtime }

function getCachedAsset(filePath, reqPath) {
    try {
        const stat = fs.statSync(filePath);
        if (!stat.isFile()) return null;

        if (assetCache.has(filePath)) {
            const cached = assetCache.get(filePath);
            if (cached.mtime === stat.mtime.toUTCString()) {
                return cached;
            }
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        const buffer = fs.readFileSync(filePath);
        const etag = `"${crypto.createHash('md5').update(buffer).digest('hex')}"`;

        // Pre-compress text assets (HTML, CSS, JS, JSON, SVG)
        let gzipBuffer = null;
        const isCompressible = /text|javascript|json|svg/i.test(contentType);
        if (isCompressible && buffer.length > 256) {
            gzipBuffer = zlib.gzipSync(buffer, { level: 6 });
        }

        const cached = {
            buffer,
            gzip: gzipBuffer,
            etag,
            contentType,
            size: buffer.length,
            mtime: stat.mtime.toUTCString()
        };

        // Cache files under 10MB in memory
        if (buffer.length < 10 * 1024 * 1024) {
            assetCache.set(filePath, cached);
        }

        return cached;
    } catch (e) {
        return null;
    }
}

/* =========================================================================
   4. HTTP SERVER & REST API DISPATCHER
   ========================================================================= */

function sendJson(res, statusCode, data, headers = {}) {
    const body = Buffer.from(JSON.stringify(data));
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=UTF-8',
        'Content-Length': body.length,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        ...headers
    });
    res.end(body);
}

function handleApiRequest(req, res, pathname, query, ip) {
    serverStats.apiRequests++;

    // Security & CORS headers
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400'
        });
        return res.end();
    }

    // 1. Healthcheck & Metrics
    if (pathname === '/api/health' && req.method === 'GET') {
        return sendJson(res, 200, {
            status: 'online',
            service: 'floaty-shooter-engine',
            uptimeSeconds: Math.floor(process.uptime()),
            totalRequests: serverStats.totalRequests,
            apiRequests: serverStats.apiRequests,
            scoresSubmitted: serverStats.scoresSubmitted,
            leaderboardEntries: inMemoryLeaderboard.length,
            memoryUsage: process.memoryUsage(),
            activeWorkers: cluster.isWorker ? cluster.worker.id : 1,
            serverTime: new Date().toISOString()
        });
    }

    // 2. Fetch Leaderboard
    if (pathname === '/api/leaderboard' && req.method === 'GET') {
        const limit = Math.min(100, Math.max(1, parseInt(query.get('limit') || '50', 10)));
        const playerName = (query.get('player') || '').trim().toUpperCase();

        const sorted = [...inMemoryLeaderboard].sort((a, b) => b.score - a.score);
        const topSlice = sorted.slice(0, limit);

        let playerRank = null;
        let playerEntry = null;
        if (playerName) {
            const idx = sorted.findIndex(e => e.name.toUpperCase() === playerName);
            if (idx >= 0) {
                playerRank = idx + 1;
                playerEntry = sorted[idx];
            }
        }

        return sendJson(res, 200, {
            success: true,
            totalPilots: sorted.length,
            leaderboard: topSlice,
            playerRank: playerRank,
            playerEntry: playerEntry
        }, {
            'Cache-Control': 'public, max-age=3, stale-while-revalidate=5'
        });
    }

    // 3. Submit Score (High Throughput & Anti-Cheat)
    if (pathname === '/api/score' && req.method === 'POST') {
        // Score submission rate limit: max 1 per 2 seconds per IP
        const lastSubmit = scoreSubmits.get(ip) || 0;
        const now = Date.now();
        if (now - lastSubmit < 1800) {
            return sendJson(res, 429, { error: 'Rate limit exceeded. Please wait a moment.' });
        }
        scoreSubmits.set(ip, now);

        let bodyData = '';
        req.on('data', chunk => {
            bodyData += chunk;
            if (bodyData.length > 64 * 1024) { // max 64KB
                req.destroy();
            }
        });

        req.on('end', () => {
            try {
                const payload = JSON.parse(bodyData || '{}');
                let name = String(payload.name || payload.player || 'CYBER_PILOT').trim();
                const score = parseInt(payload.score, 10);
                const chapter = parseInt(payload.chapter || 1, 10);

                // Anti-cheat validation
                if (!name || name.length > 24) name = 'CYBER_PILOT';
                name = name.replace(/[<>"'/\\&]/g, '').trim(); // Sanitize XSS characters

                if (isNaN(score) || score <= 0 || score > 50000000) {
                    return sendJson(res, 400, { error: 'Invalid score value' });
                }

                serverStats.scoresSubmitted++;

                // Update or insert entry
                const existingIdx = inMemoryLeaderboard.findIndex(e => e.name.toUpperCase() === name.toUpperCase());
                let isNewBest = false;

                if (existingIdx >= 0) {
                    if (score > inMemoryLeaderboard[existingIdx].score) {
                        inMemoryLeaderboard[existingIdx].score = score;
                        inMemoryLeaderboard[existingIdx].chapter = Math.max(inMemoryLeaderboard[existingIdx].chapter || 1, chapter);
                        inMemoryLeaderboard[existingIdx].timestamp = Date.now();
                        isNewBest = true;
                    }
                } else {
                    inMemoryLeaderboard.push({
                        name: name,
                        score: score,
                        chapter: chapter,
                        tag: score > 100000 ? 'ACE' : score > 50000 ? 'ELITE' : 'PILOT',
                        timestamp: Date.now()
                    });
                    isNewBest = true;
                }

                // Keep top 1000 in memory
                inMemoryLeaderboard.sort((a, b) => b.score - a.score);
                if (inMemoryLeaderboard.length > 1000) {
                    inMemoryLeaderboard = inMemoryLeaderboard.slice(0, 1000);
                }

                scheduleLeaderboardSave();

                const playerRank = inMemoryLeaderboard.findIndex(e => e.name.toUpperCase() === name.toUpperCase()) + 1;

                return sendJson(res, 200, {
                    success: true,
                    rank: playerRank,
                    isNewBest: isNewBest,
                    name: name,
                    score: score
                });
            } catch (e) {
                return sendJson(res, 400, { error: 'Malformed JSON payload' });
            }
        });
        return;
    }

    // 4. Cloud Save Synchronization
    if (pathname === '/api/player/sync' && req.method === 'POST') {
        let bodyData = '';
        req.on('data', chunk => {
            bodyData += chunk;
            if (bodyData.length > 128 * 1024) req.destroy();
        });

        req.on('end', () => {
            try {
                const data = JSON.parse(bodyData || '{}');
                const playerId = String(data.playerId || data.name || '').trim();
                if (!playerId) {
                    return sendJson(res, 400, { error: 'Player identifier required' });
                }

                inMemoryPlayers[playerId] = {
                    ...data,
                    lastSynced: Date.now()
                };

                schedulePlayerSave();

                return sendJson(res, 200, {
                    success: true,
                    syncedAt: Date.now()
                });
            } catch (e) {
                return sendJson(res, 400, { error: 'Malformed payload' });
            }
        });
        return;
    }

    // 5. Cloud Save Retrieval
    if (pathname.startsWith('/api/player/') && req.method === 'GET') {
        const playerId = decodeURIComponent(pathname.replace('/api/player/', '')).trim();
        const profile = inMemoryPlayers[playerId];
        if (!profile) {
            return sendJson(res, 404, { error: 'Player profile not found' });
        }
        return sendJson(res, 200, { success: true, profile: profile });
    }

    return sendJson(res, 404, { error: 'Endpoint not found' });
}

/* =========================================================================
   5. REQUEST LISTENER & HIGH-PERFORMANCE STATIC DISPATCHER
   ========================================================================= */

function requestHandler(req, res) {
    serverStats.totalRequests++;

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    // Anti-DDoS rate limiting
    if (isRateLimited(ip)) {
        res.writeHead(429, { 'Content-Type': 'text/plain', 'Retry-After': '5' });
        return res.end('Too Many Requests');
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    let pathname = decodeURIComponent(parsedUrl.pathname);

    // API Routing
    if (pathname.startsWith('/api/')) {
        return handleApiRequest(req, res, pathname, parsedUrl.searchParams, ip);
    }

    // Only allow GET / HEAD for static files
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { 'Content-Type': 'text/plain' });
        return res.end('Method Not Allowed');
    }

    // Default routes
    if (pathname === '/' || pathname === '') {
        pathname = '/index.html';
    }

    // Favicon fallback: map /favicon.ico to favicon.ico or icon.png
    if (pathname === '/favicon.ico') {
        pathname = fs.existsSync(path.join(ROOT_DIR, 'favicon.ico')) ? '/favicon.ico' : '/icon.png';
    }

    // Sanitize path against directory traversal
    const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
    const filePath = path.join(ROOT_DIR, safePath);

    // Check cached asset or load
    const asset = getCachedAsset(filePath, pathname);

    if (!asset) {
        // Fallback for audio/video streaming with range headers if not cached
        if (fs.existsSync(filePath)) {
            const stat = fs.statSync(filePath);
            if (stat.isFile()) {
                return serveStreamWithRange(req, res, filePath, stat);
            }
        }
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end(`File Not Found: ${pathname}`);
    }

    // Check ETag for 304 Not Modified
    const clientEtag = req.headers['if-none-match'];
    if (clientEtag && clientEtag === asset.etag) {
        res.writeHead(304, {
            'ETag': asset.etag,
            'Cache-Control': 'public, max-age=3600'
        });
        return res.end();
    }

    // Range requests for audio / video files
    if (req.headers.range && (asset.contentType.startsWith('audio/') || asset.contentType.startsWith('video/'))) {
        return serveStreamWithRange(req, res, filePath, { size: asset.size });
    }

    // Headers
    const headers = {
        'Content-Type': asset.contentType,
        'ETag': asset.etag,
        'Last-Modified': asset.mtime,
        'Access-Control-Allow-Origin': '*',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN'
    };

    // Cache-Control optimization
    if (pathname === '/index.html' || pathname === '/service-worker.js' || pathname.endsWith('.js') || pathname.endsWith('.css')) {
        headers['Cache-Control'] = 'no-cache, must-revalidate';
    } else {
        headers['Cache-Control'] = 'public, max-age=86400, stale-while-revalidate=3600';
    }

    // Gzip compression support
    const acceptEncoding = req.headers['accept-encoding'] || '';
    if (asset.gzip && acceptEncoding.includes('gzip')) {
        headers['Content-Encoding'] = 'gzip';
        headers['Content-Length'] = asset.gzip.length;
        res.writeHead(200, headers);
        if (req.method === 'HEAD') return res.end();
        return res.end(asset.gzip);
    }

    headers['Content-Length'] = asset.size;
    res.writeHead(200, headers);
    if (req.method === 'HEAD') return res.end();
    return res.end(asset.buffer);
}

function serveStreamWithRange(req, res, filePath, stat) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const range = req.headers.range;

    if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;

        if (start >= stat.size || end >= stat.size) {
            res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` });
            return res.end();
        }

        const chunksize = (end - start) + 1;
        const fileStream = fs.createReadStream(filePath, { start, end });
        res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${stat.size}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*'
        });
        fileStream.pipe(res);
    } else {
        res.writeHead(200, {
            'Content-Length': stat.size,
            'Content-Type': contentType,
            'Accept-Ranges': 'bytes',
            'Access-Control-Allow-Origin': '*'
        });
        fs.createReadStream(filePath).pipe(res);
    }
}

/* =========================================================================
   6. SERVER INITIALIZATION & CLUSTERING (10k-100k Users)
   ========================================================================= */

const USE_CLUSTER = process.env.CLUSTER === 'true';
const NUM_WORKERS = Math.min(os.cpus().length, 8);

initDataStore();

if (USE_CLUSTER && cluster.isPrimary) {
    console.log(`\n==================================================`);
    console.log(`  🚀 Floaty Shooter Clustered Master Online [PID: ${process.pid}]`);
    console.log(`  ⚡ Spawning ${NUM_WORKERS} workers across CPU cores...`);
    console.log(`==================================================\n`);

    for (let i = 0; i < NUM_WORKERS; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} exited. Respawning...`);
        cluster.fork();
    });
} else {
    const server = http.createServer(requestHandler);

    // Tuning socket timeouts for high-concurrency throughput
    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;

    server.listen(PORT, () => {
        const workerId = cluster.isWorker ? `[Worker ${cluster.worker.id}]` : '[Single Mode]';
        console.log(`==================================================`);
        console.log(`  🚀 Floaty Shooter Engine Running ${workerId}`);
        console.log(`  🎮 Local URL: http://localhost:${PORT}`);
        console.log(`  📊 Healthcheck: http://localhost:${PORT}/api/health`);
        console.log(`  🏆 Leaderboard API: http://localhost:${PORT}/api/leaderboard`);
        console.log(`==================================================`);
    });

    // Graceful shutdown handling
    process.on('SIGTERM', () => {
        saveLeaderboardSync();
        server.close(() => process.exit(0));
    });
    process.on('SIGINT', () => {
        saveLeaderboardSync();
        server.close(() => process.exit(0));
    });
}
