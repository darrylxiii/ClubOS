import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics for soak testing
const errorRate = new Rate('errors');
const memoryLeakIndicator = new Trend('response_time_drift');
const hourlyErrors = new Counter('hourly_errors');

// Soak test configuration - sustained load over extended period
export const options = {
  stages: [
    { duration: '5m', target: 100 },    // Ramp up
    { duration: '4h', target: 100 },    // Sustained load for 4 hours
    { duration: '5m', target: 0 },      // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],   // P95 under 1s
    http_req_failed: ['rate<0.02'],      // Under 2% failure rate
    errors: ['rate<0.03'],               // Custom error rate under 3%
    response_time_drift: ['avg<500'],    // Watch for degradation
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://dpjucecmoyfzrduhlctt.supabase.co';
const ANON_KEY = __ENV.ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwanVjZWNtb3lmenJkdWhsY3R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0Mjc2MTAsImV4cCI6MjA3NTAwMzYxMH0.hdX709NlaXPUE4ohWtd3LBuAOqPKCBhVep694LC6tRw';

const headers = {
  'Content-Type': 'application/json',
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
};

let iterationStartTime = Date.now();
let baselineResponseTime = null;

export default function () {
  // Track response time drift over time (memory leak indicator)
  group('Soak Test - Standard Operations', function () {
    // Job listings
    const jobsStart = Date.now();
    const jobsRes = http.get(`${BASE_URL}/rest/v1/jobs?select=*&status=eq.published&limit=20`, {
      headers,
    });
    const jobsDuration = Date.now() - jobsStart;
    
    // Establish baseline in first minute
    if (Date.now() - iterationStartTime < 60000) {
      if (!baselineResponseTime) baselineResponseTime = jobsDuration;
    } else {
      // Track drift from baseline
      memoryLeakIndicator.add(jobsDuration - (baselineResponseTime || jobsDuration));
    }
    
    const jobsSuccess = check(jobsRes, {
      'soak jobs status 200': (r) => r.status === 200,
      'soak jobs < 1s': (r) => r.timings.duration < 1000,
    });
    
    if (!jobsSuccess) {
      errorRate.add(1);
      hourlyErrors.add(1);
    }
  });

  sleep(1);

  group('Soak Test - Data Integrity', function () {
    // Verify data consistency over time
    const res = http.get(`${BASE_URL}/rest/v1/companies?select=id,name&limit=5`, { headers });
    
    const success = check(res, {
      'companies data consistent': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body) && body.every(c => c.id && c.name);
        } catch {
          return false;
        }
      },
    });
    
    if (!success) errorRate.add(1);
  });

  sleep(2);

  group('Soak Test - Connection Stability', function () {
    // Multiple rapid requests to test connection pooling
    for (let i = 0; i < 3; i++) {
      const res = http.get(`${BASE_URL}/rest/v1/jobs?select=id&limit=1`, { headers });
      check(res, {
        'rapid request success': (r) => r.status === 200,
      });
    }
  });

  sleep(3);
}

export function handleSummary(data) {
  return {
    'tests/load/results/soak-summary.json': JSON.stringify(data, null, 2),
    stdout: soakSummary(data),
  };
}

function soakSummary(data) {
  const { metrics } = data;
  const durationHours = (data.state?.testRunDurationMs || 0) / 3600000;
  
  return `
╔════════════════════════════════════════════════════════════════╗
║                    K6 SOAK TEST RESULTS                         ║
╠════════════════════════════════════════════════════════════════╣
║ Test Duration:       ${durationHours.toFixed(2)} hours
║ Total Requests:      ${metrics.http_reqs?.values?.count || 0}
║ Failed Requests:     ${(metrics.http_req_failed?.values?.rate * 100)?.toFixed(2) || 0}%
║ Hourly Errors:       ${metrics.hourly_errors?.values?.count || 0}
╠════════════════════════════════════════════════════════════════╣
║ Response Time Analysis:
║   Average:           ${metrics.http_req_duration?.values?.avg?.toFixed(2) || 0}ms
║   P95:               ${metrics.http_req_duration?.values?.['p(95)']?.toFixed(2) || 0}ms
║   Response Drift:    ${metrics.response_time_drift?.values?.avg?.toFixed(2) || 0}ms
╠════════════════════════════════════════════════════════════════╣
║ Stability Indicators:
║   Memory Leak Risk:  ${(metrics.response_time_drift?.values?.avg || 0) > 200 ? '⚠️ HIGH' : '✓ LOW'}
║   Connection Pool:   ${(metrics.http_req_failed?.values?.rate || 0) < 0.01 ? '✓ STABLE' : '⚠️ DEGRADED'}
║   Error Trend:       ${(metrics.errors?.values?.rate || 0) < 0.02 ? '✓ STABLE' : '⚠️ INCREASING'}
╚════════════════════════════════════════════════════════════════╝
`;
}
