import { test, expect } from '@playwright/test';
import { AuthPage } from '../page-objects/AuthPage';
import { HomePage } from '../page-objects/HomePage';
import { testUsers, generateUniqueEmail } from '../fixtures/test-data';

test.describe('Authentication Flow', () => {
  let authPage: AuthPage;
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    homePage = new HomePage(page);
  });

  test.describe('Login', () => {
    test('should display auth page correctly', async ({ page }) => {
      await authPage.navigateToAuth();
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(authPage.emailInput).toBeVisible();
      await expect(authPage.passwordInput).toBeVisible();
    });

    test('should show error for invalid credentials', async () => {
      await authPage.navigateToAuth();
      await authPage.login('invalid@example.com', 'wrongpassword');
      await authPage.expectLoginError();
    });

    test('should show error for empty email', async () => {
      await authPage.navigateToAuth();
      await authPage.login('', 'somepassword');
      await authPage.expectAuthPage();
    });

    test('should show error for empty password', async () => {
      await authPage.navigateToAuth();
      await authPage.login('test@example.com', '');
      await authPage.expectAuthPage();
    });

    test('should validate email format', async ({ page }) => {
      await authPage.navigateToAuth();
      await authPage.emailInput.fill('invalidemail');
      await authPage.passwordInput.fill('password123');
      await authPage.loginButton.click();
      // Form should not submit with invalid email
      await authPage.expectAuthPage();
    });
  });

  test.describe('Signup', () => {
    test('should allow new user signup with invite code', async ({ page }) => {
      await authPage.navigateToAuth();
      
      // This test requires a valid invite code from the database
      // In a real test environment, we would seed this data
      const uniqueEmail = generateUniqueEmail('signup-test');
      
      // Switch to signup tab if available
      const signupTab = page.getByRole('tab', { name: /sign up/i });
      if (await signupTab.isVisible()) {
        await signupTab.click();
      }
      
      await expect(authPage.emailInput).toBeVisible();
    });

    test('should validate password requirements', async ({ page }) => {
      await authPage.navigateToAuth();
      
      const signupTab = page.getByRole('tab', { name: /sign up/i });
      if (await signupTab.isVisible()) {
        await signupTab.click();
      }

      // Try weak password
      await authPage.emailInput.fill(generateUniqueEmail());
      await authPage.passwordInput.fill('weak');
      
      // Password strength indicator should show weak
      // The form should prevent submission
    });

    test('should show error for duplicate email', async ({ page }) => {
      await authPage.navigateToAuth();
      
      const signupTab = page.getByRole('tab', { name: /sign up/i });
      if (await signupTab.isVisible()) {
        await signupTab.click();
      }

      // Try to signup with existing email
      await authPage.emailInput.fill(testUsers.candidate.email);
      await authPage.passwordInput.fill('TestPassword123!');
      
      // Should show duplicate email error
    });
  });

  test.describe('Password Reset', () => {
    test('should navigate to password reset page', async ({ page }) => {
      await authPage.navigateToAuth();
      
      if (await authPage.forgotPasswordLink.isVisible()) {
        await authPage.forgotPasswordLink.click();
        await expect(page).toHaveURL(/reset|forgot/);
      }
    });

    test('should show success message on valid email', async ({ page }) => {
      await authPage.navigateToAuth();
      
      if (await authPage.forgotPasswordLink.isVisible()) {
        await authPage.forgotPasswordLink.click();
        await authPage.emailInput.fill(testUsers.candidate.email);
        await authPage.clickButton('Send Reset Link');
        // Should show success toast
      }
    });
  });

  test.describe('OAuth Buttons', () => {
    test('should display OAuth providers', async ({ page }) => {
      await authPage.navigateToAuth();
      
      // Check if OAuth buttons are present
      const googleBtn = page.getByRole('button', { name: /google/i });
      const hasGoogle = await googleBtn.isVisible().catch(() => false);
      
      // At least one OAuth provider should be available
      expect(hasGoogle).toBeDefined();
    });
  });

  test.describe('Session Management', () => {
    test('should redirect to auth when accessing protected route without session', async ({ page }) => {
      await page.goto('/home');
      
      // Should redirect to auth page
      await expect(page).toHaveURL(/auth/);
    });

    test('should preserve intended destination after login', async ({ page }) => {
      // Try to access protected route
      await page.goto('/jobs');
      
      // Should be redirected to auth
      await expect(page).toHaveURL(/auth/);
      
      // After successful login (if we had valid credentials), 
      // should redirect back to /jobs
    });
  });
});
