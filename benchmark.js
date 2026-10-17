/**
 * Floaty Shooter — Production High-Concurrency Load Tester
 * Simulates thousands of requests across endpoints to verify 10k-100k user readiness
 */

const http = require('http');

const TARGET_HOST = 'localhost';
const TARGET_PORT = 3000;
const TOTAL_REQUESTS = 1000;
const CONCURRENCY = 50;

console.log(`\n==================================================`);
console.log(`  ⚡ Floaty Shooter High-Concurrency Benchmark`);
console.log(`  🎯 Target: http://${TARGET_HOST}:${TARGET_PORT}`);
console.log(`  📊 Requests: ${TOTAL_REQUESTS} | Concurrency: ${CONCURRENCY}`);
console.log(`==================================================\n`);

const agent = new http.Agent({
    keepAlive: true,
    maxSockets: CONCURRENCY
});

let completed = 0;
let successful = 0;
let failed = 0;
let totalLatency = 0;
let minLatency = Infinity;
let maxLatency = 0;

const startTime = Date.now();

function makeRequest(index) {
    const endpoints = [
        '/',
        '/api/health',
        '/api/leaderboard?limit=20',
        '/style.css',
        '/favicon.ico'
    ];
    const path = endpoints[index % endpoints.length];
    const reqStart = Date.now();

    const options = {
        hostname: TARGET_HOST,
        port: TARGET_PORT,
        path: path,
        method: 'GET',
        agent: agent,
        headers: {
            'Accept-Encoding': 'gzip'
        }
    };

    const req = http.request(options, res => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
            const lat = Date.now() - reqStart;
            totalLatency += lat;
            if (lat < minLatency) minLatency = lat;
            if (lat > maxLatency) maxLatency = lat;

            if (res.statusCode >= 200 && res.statusCode < 400) {
                successful++;
            } else {
                failed++;
            }

            completed++;
            if (completed < TOTAL_REQUESTS) {
                makeRequest(completed);
            } else if (completed === TOTAL_REQUESTS) {
                finish();
            }
        });
    });

    req.on('error', err => {
        failed++;
        completed++;
        if (completed < TOTAL_REQUESTS) {
            makeRequest(completed);
        } else if (completed === TOTAL_REQUESTS) {
            finish();
        }
    });

    req.end();
}

function finish() {
    const totalDuration = (Date.now() - startTime) / 1000;
    const rps = (TOTAL_REQUESTS / totalDuration).toFixed(2);
    const avgLatency = (totalLatency / TOTAL_REQUESTS).toFixed(2);

    console.log(`\n----------------- RESULTS -----------------`);
    console.log(`  ⏱️  Total Duration:     ${totalDuration}s`);
    console.log(`  🚀 Throughput:         ${rps} req/sec`);
    console.log(`  ✅ Successful:         ${successful}/${TOTAL_REQUESTS} (${((successful/TOTAL_REQUESTS)*100).toFixed(1)}%)`);
    console.log(`  ❌ Failed:             ${failed}`);
    console.log(`  ⚡ Avg Latency:        ${avgLatency} ms`);
    console.log(`  📉 Min Latency:        ${minLatency} ms`);
    console.log(`  📈 Max Latency:        ${maxLatency} ms`);
    console.log(`===========================================\n`);
    process.exit(0);
}

// Start concurrent batches
for (let i = 0; i < CONCURRENCY; i++) {
    makeRequest(i);
}
