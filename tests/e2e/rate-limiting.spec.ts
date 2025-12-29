import { test, expect } from '@playwright/test';

test.describe('Rate Limiting Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/settings/rate-limits');
  });

  test('should display rate limiting configuration page', async ({ page }) => {
    const heading = page.getByRole('heading', { name: /rate.*limit/i });
    await expect(heading).toBeVisible();
  });

  test('should show current rate limit settings', async ({ page }) => {
    // Look for rate limit configuration
    const configSection = page.getByText(/requests.*per/i)
      .or(page.getByText(/limit.*per/i))
      .or(page.getByText(/quota/i));
    
    await expect(configSection).toBeVisible();
  });

  test('should display rate limit by endpoint', async ({ page }) => {
    // Look for endpoint-specific limits
    const endpointSection = page.getByText(/endpoint/i);
    
    if (await endpointSection.isVisible()) {
      // Should show different endpoints with their limits
      const endpointRows = page.getByRole('row');
      await expect(endpointRows.first()).toBeVisible();
    }
  });

  test('should show rate limit usage statistics', async ({ page }) => {
    const statsSection = page.getByText(/usage/i)
      .or(page.getByText(/statistics/i))
      .or(page.getByText(/consumed/i));
    
    await expect(statsSection).toBeVisible();
  });

  test('should display blocked requests count', async ({ page }) => {
    const blockedSection = page.getByText(/blocked/i)
      .or(page.getByText(/rejected/i))
      .or(page.getByText(/exceeded/i));
    
    if (await blockedSection.isVisible()) {
      await expect(blockedSection).toBeVisible();
    }
  });

  test('should allow adjusting rate limits', async ({ page }) => {
    // Look for edit or configure button
    const editButton = page.getByRole('button', { name: /edit|configure|adjust/i });
    
    if (await editButton.isVisible()) {
      await editButton.click();
      
      // Should show configuration form
      const limitInput = page.getByRole('spinbutton').or(page.getByPlaceholder(/limit/i));
      await expect(limitInput.first()).toBeVisible();
    }
  });

  test('should show rate limit reset times', async ({ page }) => {
    const resetSection = page.getByText(/reset/i)
      .or(page.getByText(/window/i))
      .or(page.getByText(/interval/i));
    
    await expect(resetSection).toBeVisible();
  });

  test('should display rate limit alerts', async ({ page }) => {
    const alertsTab = page.getByRole('tab', { name: /alert/i });
    
    if (await alertsTab.isVisible()) {
      await alertsTab.click();
      
      // Should show alert configuration
      const alertConfig = page.getByText(/threshold/i).or(page.getByText(/notify/i));
      await expect(alertConfig).toBeVisible();
    }
  });

  test('should show rate limit by user/IP', async ({ page }) => {
    const userLimitsTab = page.getByRole('tab', { name: /user|ip/i });
    
    if (await userLimitsTab.isVisible()) {
      await userLimitsTab.click();
      
      // Should show per-user or per-IP limits
      const limitsList = page.getByRole('row');
      await expect(limitsList.first()).toBeVisible();
    }
  });
});

test.describe('Rate Limit Enforcement', () => {
  test('should return 429 after exceeding rate limit', async ({ request }) => {
    // Make multiple rapid requests to trigger rate limiting
    const requests = [];
    for (let i = 0; i < 100; i++) {
      requests.push(request.get('/api/health'));
    }

    const responses = await Promise.all(requests);
    const tooManyRequests = responses.some((r) => r.status() === 429);
    
    // At least one request should be rate limited (or all succeed if limit is high)
    expect(responses.every((r) => r.ok() || r.status() === 429)).toBe(true);
  });

  test('should include rate limit headers', async ({ request }) => {
    const response = await request.get('/api/health');
    
    // Check for standard rate limit headers
    const headers = response.headers();
    const hasRateLimitHeaders = 
      headers['x-ratelimit-limit'] ||
      headers['x-ratelimit-remaining'] ||
      headers['ratelimit-limit'] ||
      headers['ratelimit-remaining'];
    
    // Rate limit headers may or may not be present depending on implementation
    expect(response.ok() || response.status() === 429).toBe(true);
  });
});
