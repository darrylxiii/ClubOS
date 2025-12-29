import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency');
const peakErrorCount = new Counter('peak_errors');

// Stress test configuration - push to breaking point
export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '3m', target: 100 },   // Stay at 100
    { duration: '2m', target: 300 },   // Ramp to 300 users
    { duration: '3m', target: 300 },   // Stay at 300
    { duration: '2m', target: 500 },   // Push to 500 users
    { duration: '5m', target: 500 },   // Hold at peak
    { duration: '3m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],   // Allow up to 2s under stress
    http_req_failed: ['rate<0.10'],      // Up to 10% failures acceptable
    errors: ['rate<0.15'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://dpjucecmoyfzrduhlctt.supabase.co';
const ANON_KEY = __ENV.ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwanVjZWNtb3lmenJkdWhsY3R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0Mjc2MTAsImV4cCI6MjA3NTAwMzYxMH0.hdX709NlaXPUE4ohWtd3LBuAOqPKCBhVep694LC6tRw';

const headers = {
  'Content-Type': 'application/json',
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
};

export default function () {
  // Simulate mixed workload under stress
  const scenario = Math.random();

  if (scenario < 0.4) {
    // 40% - Job browsing (most common)
    group('Job Browsing Under Stress', function () {
      const startTime = Date.now();
      
      const res = http.get(`${BASE_URL}/rest/v1/jobs?select=*&status=eq.published&limit=20`, {
        headers,
        timeout: '30s',
      });
      
      apiLatency.add(Date.now() - startTime);
      
      const success = check(res, {
        'job browse status is 200': (r) => r.status === 200,
        'job browse response time < 2s': (r) => r.timings.duration < 2000,
      });
      
      if (!success) {
        errorRate.add(1);
        peakErrorCount.add(1);
      }
    });
  } else if (scenario < 0.7) {
    // 30% - Search operations
    group('Search Under Stress', function () {
      const searchTerms = ['engineer', 'designer', 'product', 'data', 'sales'];
      const term = searchTerms[Math.floor(Math.random() * searchTerms.length)];
      
      const res = http.get(
        `${BASE_URL}/rest/v1/jobs?select=*&title=ilike.*${term}*&status=eq.published`,
        { headers, timeout: '30s' }
      );
      
      const success = check(res, {
        'search status is 200': (r) => r.status === 200,
      });
      
      if (!success) {
        errorRate.add(1);
      }
    });
  } else if (scenario < 0.9) {
    // 20% - Company profiles
    group('Company Profiles Under Stress', function () {
      const res = http.get(`${BASE_URL}/rest/v1/companies?select=*&limit=5`, {
        headers,
        timeout: '30s',
      });
      
      check(res, {
        'company profile status is 200': (r) => r.status === 200,
      });
    });
  } else {
    // 10% - Heavy aggregation queries
    group('Aggregation Queries Under Stress', function () {
      const res = http.get(
        `${BASE_URL}/rest/v1/jobs?select=company_id,count&status=eq.published`,
        { headers, timeout: '60s' }
      );
      
      check(res, {
        'aggregation status is 200': (r) => r.status === 200,
      });
    });
  }

  sleep(Math.random() * 2 + 0.5); // Random sleep 0.5-2.5s
}

export function handleSummary(data) {
  return {
    'tests/load/results/stress-summary.json': JSON.stringify(data, null, 2),
    stdout: stressSummary(data),
  };
}

function stressSummary(data) {
  const { metrics } = data;
  
  return `
╔════════════════════════════════════════════════════════════════╗
║                   K6 STRESS TEST RESULTS                        ║
╠════════════════════════════════════════════════════════════════╣
║ Peak VUs:            ${data.options?.stages?.reduce((max, s) => Math.max(max, s.target), 0) || 'N/A'}
║ Total Requests:      ${metrics.http_reqs?.values?.count || 0}
║ Failed Requests:     ${(metrics.http_req_failed?.values?.rate * 100)?.toFixed(2) || 0}%
║ Peak Errors:         ${metrics.peak_errors?.values?.count || 0}
╠════════════════════════════════════════════════════════════════╣
║ Response Times:
║   Average:           ${metrics.http_req_duration?.values?.avg?.toFixed(2) || 0}ms
║   P50:               ${metrics.http_req_duration?.values?.['p(50)']?.toFixed(2) || 0}ms
║   P95:               ${metrics.http_req_duration?.values?.['p(95)']?.toFixed(2) || 0}ms
║   P99:               ${metrics.http_req_duration?.values?.['p(99)']?.toFixed(2) || 0}ms
║   Max:               ${metrics.http_req_duration?.values?.max?.toFixed(2) || 0}ms
╠════════════════════════════════════════════════════════════════╣
║ Throughput:          ${(metrics.http_reqs?.values?.rate)?.toFixed(2) || 0} req/s
╚════════════════════════════════════════════════════════════════╝
`;
}
