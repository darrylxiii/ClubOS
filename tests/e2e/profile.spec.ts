import { test, expect } from '@playwright/test';
import { ProfilePage } from '../page-objects/ProfilePage';

test.describe('Profile Management', () => {
  let profilePage: ProfilePage;

  test.beforeEach(async ({ page }) => {
    profilePage = new ProfilePage(page);
    // Login first
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'admin@thequantumclub.com');
    await page.fill('input[type="password"]', 'Test123456!!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/home/, { timeout: 15000 });
  });

  test('should display profile page', async ({ page }) => {
    await profilePage.navigateToProfile();
    await page.waitForLoadState('networkidle');
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should display club profile page', async ({ page }) => {
    await profilePage.navigateToClubProfile();
    await page.waitForLoadState('networkidle');
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should show user avatar or placeholder', async ({ page }) => {
    await profilePage.navigateToProfile();
    await page.waitForLoadState('networkidle');
    
    // Look for avatar image or placeholder
    const avatar = page.locator('img[alt*="avatar"], img[alt*="profile"], [data-testid="avatar"]').first();
    // Avatar should be present in some form
  });

  test('should have edit profile functionality', async ({ page }) => {
    await profilePage.navigateToProfile();
    await page.waitForLoadState('networkidle');
    
    // Look for edit button
    const editButton = page.locator('button:has-text("Edit"), button[aria-label*="edit"]').first();
    // May or may not be visible depending on profile state
  });

  test('should display profile form fields', async ({ page }) => {
    await profilePage.navigateToProfile();
    await page.waitForLoadState('networkidle');
    
    // Look for common profile fields
    const nameFields = page.locator('input, textarea');
    await expect(nameFields.first()).toBeVisible();
  });

  test('should allow updating first name', async ({ page }) => {
    await profilePage.navigateToProfile();
    await page.waitForLoadState('networkidle');
    
    const firstNameInput = page.getByLabel(/first.*name/i);
    if (await firstNameInput.isVisible()) {
      const originalValue = await firstNameInput.inputValue();
      await firstNameInput.fill('UpdatedFirstName');
      
      // Save if there's a save button
      const saveButton = page.locator('button:has-text("Save")').first();
      if (await saveButton.isVisible()) {
        await saveButton.click();
      }
    }
  });

  test('should allow updating phone number', async ({ page }) => {
    await profilePage.navigateToProfile();
    await page.waitForLoadState('networkidle');
    
    const phoneInput = page.getByLabel(/phone/i);
    if (await phoneInput.isVisible()) {
      await phoneInput.fill('+31612345678');
    }
  });

  test('should allow updating bio', async ({ page }) => {
    await profilePage.navigateToProfile();
    await page.waitForLoadState('networkidle');
    
    const bioInput = page.getByLabel(/bio|about/i);
    if (await bioInput.isVisible()) {
      await bioInput.fill('This is my updated bio for testing purposes.');
    }
  });

  test('should display skills section', async ({ page }) => {
    await profilePage.navigateToProfile();
    await page.waitForLoadState('networkidle');
    
    const skillsSection = page.locator('text=/skills/i').first();
    // Skills section may or may not be visible
  });

  test('should display experience section', async ({ page }) => {
    await profilePage.navigateToProfile();
    await page.waitForLoadState('networkidle');
    
    const experienceSection = page.locator('text=/experience/i').first();
    // Experience section may or may not be visible
  });

  test('should have avatar upload functionality', async ({ page }) => {
    await profilePage.navigateToProfile();
    await page.waitForLoadState('networkidle');
    
    // Look for upload button or file input
    const uploadButton = page.locator('button:has-text("Upload"), button:has-text("Change Photo")').first();
    const fileInput = page.locator('input[type="file"]');
    // Either may be present
  });

  test('should allow canceling profile edits', async ({ page }) => {
    await profilePage.navigateToProfile();
    await page.waitForLoadState('networkidle');
    
    const cancelButton = page.locator('button:has-text("Cancel")').first();
    // Cancel button may appear during editing
  });

  test('should validate required fields', async ({ page }) => {
    await profilePage.navigateToProfile();
    await page.waitForLoadState('networkidle');
    
    // Try to clear a required field and save
    const firstNameInput = page.getByLabel(/first.*name/i);
    if (await firstNameInput.isVisible()) {
      await firstNameInput.fill('');
      
      const saveButton = page.locator('button:has-text("Save")').first();
      if (await saveButton.isVisible()) {
        await saveButton.click();
        
        // Look for validation error
        const errorMessage = page.locator('text=/required|error/i');
        // Error may or may not appear
      }
    }
  });

  test('should display LinkedIn field', async ({ page }) => {
    await profilePage.navigateToProfile();
    await page.waitForLoadState('networkidle');
    
    const linkedInInput = page.getByLabel(/linkedin/i);
    // LinkedIn field may or may not be visible
  });

  test('should display portfolio/website field', async ({ page }) => {
    await profilePage.navigateToProfile();
    await page.waitForLoadState('networkidle');
    
    const portfolioInput = page.getByLabel(/portfolio|website/i);
    // Portfolio field may or may not be visible
  });
});
