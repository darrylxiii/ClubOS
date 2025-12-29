import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const jobListingDuration = new Trend('job_listing_duration');
const applicationSubmitDuration = new Trend('application_submit_duration');
const dashboardLoadDuration = new Trend('dashboard_load_duration');

// Test configuration - baseline load
export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 50 },   // Stay at 50 users
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],      // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],        // Error rate under 1%
    errors: ['rate<0.05'],                  // Custom error rate under 5%
    job_listing_duration: ['p(95)<300'],   // Job listings under 300ms
    dashboard_load_duration: ['p(95)<800'], // Dashboard under 800ms
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
  group('Public Job Listings', function () {
    const startTime = Date.now();
    
    const res = http.get(`${BASE_URL}/rest/v1/jobs?select=*&status=eq.published&limit=20`, {
      headers,
    });
    
    jobListingDuration.add(Date.now() - startTime);
    
    const success = check(res, {
      'job listing status is 200': (r) => r.status === 200,
      'job listing response time < 500ms': (r) => r.timings.duration < 500,
      'job listing has data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body);
        } catch {
          return false;
        }
      },
    });
    
    errorRate.add(!success);
  });

  sleep(1);

  group('Company Profiles', function () {
    const res = http.get(`${BASE_URL}/rest/v1/companies?select=id,name,logo_url,industry&limit=10`, {
      headers,
    });
    
    check(res, {
      'company listing status is 200': (r) => r.status === 200,
      'company listing response time < 300ms': (r) => r.timings.duration < 300,
    });
  });

  sleep(1);

  group('Job Search with Filters', function () {
    const res = http.get(
      `${BASE_URL}/rest/v1/jobs?select=*&status=eq.published&location_type=eq.remote&limit=10`,
      { headers }
    );
    
    check(res, {
      'filtered search status is 200': (r) => r.status === 200,
      'filtered search response time < 400ms': (r) => r.timings.duration < 400,
    });
  });

  sleep(2);
}

export function handleSummary(data) {
  return {
    'tests/load/results/baseline-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, opts) {
  const { metrics } = data;
  
  let summary = `
╔════════════════════════════════════════════════════════════════╗
║                  K6 BASELINE LOAD TEST RESULTS                  ║
╠════════════════════════════════════════════════════════════════╣
║ Total Requests:      ${metrics.http_reqs?.values?.count || 0}
║ Failed Requests:     ${metrics.http_req_failed?.values?.rate?.toFixed(4) || 0}%
║ Avg Response Time:   ${metrics.http_req_duration?.values?.avg?.toFixed(2) || 0}ms
║ P95 Response Time:   ${metrics.http_req_duration?.values?.['p(95)']?.toFixed(2) || 0}ms
║ P99 Response Time:   ${metrics.http_req_duration?.values?.['p(99)']?.toFixed(2) || 0}ms
╠════════════════════════════════════════════════════════════════╣
║ Custom Metrics:
║   Job Listings P95:  ${metrics.job_listing_duration?.values?.['p(95)']?.toFixed(2) || 0}ms
║   Dashboard P95:     ${metrics.dashboard_load_duration?.values?.['p(95)']?.toFixed(2) || 0}ms
║   Error Rate:        ${(metrics.errors?.values?.rate * 100)?.toFixed(2) || 0}%
╚════════════════════════════════════════════════════════════════╝
`;
  
  return summary;
}
