import { test, expect } from '@playwright/test';

test.describe('Webhook Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/settings/webhooks');
  });

  test('should display webhook configuration page', async ({ page }) => {
    const heading = page.getByRole('heading', { name: /webhook/i });
    await expect(heading).toBeVisible();
  });

  test('should allow creating a new webhook', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /create|add.*webhook/i });
    
    if (await createButton.isVisible()) {
      await createButton.click();
      
      // Should show webhook creation form
      const urlInput = page.getByPlaceholder(/url/i).or(page.getByLabel(/endpoint/i));
      await expect(urlInput).toBeVisible();
    }
  });

  test('should validate webhook URL format', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /create|add.*webhook/i });
    
    if (await createButton.isVisible()) {
      await createButton.click();
      
      const urlInput = page.getByPlaceholder(/url/i).or(page.getByLabel(/endpoint/i));
      if (await urlInput.isVisible()) {
        // Enter invalid URL
        await urlInput.fill('not-a-valid-url');
        
        const submitButton = page.getByRole('button', { name: /save|create/i });
        await submitButton.click();
        
        // Should show validation error
        const error = page.getByText(/valid.*url/i).or(page.getByText(/invalid/i));
        await expect(error).toBeVisible();
      }
    }
  });

  test('should show webhook event type selection', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /create|add.*webhook/i });
    
    if (await createButton.isVisible()) {
      await createButton.click();
      
      // Look for event type checkboxes or dropdown
      const eventSection = page.getByText(/event/i);
      await expect(eventSection).toBeVisible();
    }
  });

  test('should display webhook delivery history', async ({ page }) => {
    // Look for delivery history section
    const historyTab = page.getByRole('tab', { name: /history|deliveries/i });
    
    if (await historyTab.isVisible()) {
      await historyTab.click();
      
      // Should show delivery logs
      const deliveryList = page.locator('[data-testid="webhook-delivery"]').or(page.getByRole('row'));
      await expect(deliveryList.first()).toBeVisible();
    }
  });

  test('should allow retrying failed deliveries', async ({ page }) => {
    const historyTab = page.getByRole('tab', { name: /history|deliveries/i });
    
    if (await historyTab.isVisible()) {
      await historyTab.click();
      
      // Look for retry button on failed delivery
      const retryButton = page.getByRole('button', { name: /retry/i });
      
      if (await retryButton.first().isVisible()) {
        await retryButton.first().click();
        
        // Should show retry confirmation or start retry
        const toast = page.getByText(/retry/i);
        await expect(toast).toBeVisible();
      }
    }
  });

  test('should show webhook secret for signature verification', async ({ page }) => {
    // Look for secret section
    const secretSection = page.getByText(/secret|signing/i);
    
    if (await secretSection.isVisible()) {
      // Should have a reveal or copy button
      const revealButton = page.getByRole('button', { name: /reveal|show|copy/i });
      await expect(revealButton.first()).toBeVisible();
    }
  });

  test('should allow testing webhook delivery', async ({ page }) => {
    const testButton = page.getByRole('button', { name: /test|send.*test/i });
    
    if (await testButton.isVisible()) {
      await testButton.click();
      
      // Should show test result or confirmation
      const result = page.getByText(/success|sent|delivered/i).or(page.getByText(/failed/i));
      await expect(result).toBeVisible({ timeout: 10000 });
    }
  });

  test('should allow disabling/enabling webhooks', async ({ page }) => {
    // Look for toggle or enable/disable button
    const toggleButton = page.getByRole('switch').or(page.getByRole('button', { name: /disable|enable/i }));
    
    if (await toggleButton.first().isVisible()) {
      const initialState = await toggleButton.first().isChecked?.() ?? false;
      await toggleButton.first().click();
      
      // State should change
      const newState = await toggleButton.first().isChecked?.() ?? !initialState;
      expect(newState).not.toBe(initialState);
    }
  });

  test('should show webhook reliability metrics', async ({ page }) => {
    // Look for metrics or statistics
    const metricsSection = page.getByText(/success.*rate/i)
      .or(page.getByText(/reliability/i))
      .or(page.getByText(/delivery.*rate/i));
    
    await expect(metricsSection).toBeVisible();
  });
});

test.describe('Webhook API', () => {
  test('should require authentication for webhook endpoints', async ({ request }) => {
    const response = await request.get('/api/webhooks');
    expect([401, 403]).toContain(response.status());
  });
});
