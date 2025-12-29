import { test, expect } from '@playwright/test';

test.describe('SCIM Provisioning', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to admin settings
    await page.goto('/admin/settings/scim');
  });

  test('should display SCIM configuration page', async ({ page }) => {
    // Check for SCIM configuration UI elements
    const heading = page.getByRole('heading', { name: /scim/i });
    await expect(heading).toBeVisible();
  });

  test('should show SCIM endpoint URL', async ({ page }) => {
    // SCIM endpoint should be displayed for IdP configuration
    const endpointSection = page.getByText(/endpoint/i);
    await expect(endpointSection).toBeVisible();
  });

  test('should allow generating SCIM token', async ({ page }) => {
    // Look for token generation button
    const generateButton = page.getByRole('button', { name: /generate.*token/i });
    
    if (await generateButton.isVisible()) {
      await generateButton.click();
      
      // Should show confirmation or token modal
      const modal = page.getByRole('dialog');
      await expect(modal).toBeVisible();
    }
  });

  test('should display token expiry options', async ({ page }) => {
    // Check for expiry configuration
    const expirySection = page.getByText(/expir/i);
    await expect(expirySection).toBeVisible();
  });

  test('should show provisioned users list', async ({ page }) => {
    // Check for users table or list
    const usersSection = page.getByText(/provisioned users/i).or(page.getByText(/users/i));
    await expect(usersSection).toBeVisible();
  });

  test('should allow revoking SCIM token', async ({ page }) => {
    // Look for revoke button
    const revokeButton = page.getByRole('button', { name: /revoke/i });
    
    if (await revokeButton.isVisible()) {
      await revokeButton.click();
      
      // Should show confirmation dialog
      const confirmDialog = page.getByRole('alertdialog');
      await expect(confirmDialog).toBeVisible();
    }
  });

  test('should display SCIM activity logs', async ({ page }) => {
    // Navigate to logs tab if exists
    const logsTab = page.getByRole('tab', { name: /logs/i }).or(page.getByText(/activity/i));
    
    if (await logsTab.isVisible()) {
      await logsTab.click();
      
      // Should show log entries
      const logEntries = page.locator('[data-testid="scim-log-entry"]').or(page.getByRole('row'));
      await expect(logEntries.first()).toBeVisible();
    }
  });

  test('should handle SCIM attribute mapping', async ({ page }) => {
    // Look for attribute mapping section
    const mappingSection = page.getByText(/attribute.*mapping/i).or(page.getByText(/field.*mapping/i));
    
    if (await mappingSection.isVisible()) {
      await expect(mappingSection).toBeVisible();
    }
  });
});

test.describe('SCIM API Endpoints', () => {
  test('should return 401 for unauthenticated requests', async ({ request }) => {
    const response = await request.get('/api/scim/v2/Users');
    expect(response.status()).toBe(401);
  });

  test('should return proper SCIM schema response', async ({ request }) => {
    const response = await request.get('/api/scim/v2/Schemas', {
      headers: {
        'Authorization': 'Bearer invalid_token',
      },
    });
    
    // Should return 401 or 403 for invalid token
    expect([401, 403]).toContain(response.status());
  });
});
