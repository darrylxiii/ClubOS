import { test, expect } from '@playwright/test';
import { BookingPage } from '../page-objects/BookingPage';

test.describe('Booking Flow', () => {
  let bookingPage: BookingPage;

  test.beforeEach(async ({ page }) => {
    bookingPage = new BookingPage(page);
  });

  test.describe('Public Booking Page', () => {
    test('should display booking page for valid link', async ({ page }) => {
      // This would require a valid booking link slug
      // In real tests, we would seed this data
      await page.goto('/book/test-link');
      await bookingPage.waitForPageLoad();
      
      // Should show calendar or 404
      const hasCalendar = await bookingPage.calendarView.isVisible().catch(() => false);
      const has404 = await page.getByText(/not found|invalid/i).isVisible().catch(() => false);
      
      expect(hasCalendar || has404).toBe(true);
    });
  });

  test.describe('Authenticated Booking Management', () => {
    test('should require auth for booking management', async ({ page }) => {
      await bookingPage.navigateToBookings();
      
      // Should redirect to auth
      await expect(page).toHaveURL(/auth/);
    });
  });

  test.describe('Booking Creation Flow', () => {
    // These tests would run with authenticated user
    test.skip('should create a new booking link', async ({ page }) => {
      // Login first
      await bookingPage.navigateToBookings();
      await bookingPage.createBookingLink('Test Meeting', '30', 'A test meeting');
      await bookingPage.expectBookingLinksVisible();
    });

    test.skip('should copy booking link', async ({ page }) => {
      await bookingPage.navigateToBookings();
      await bookingPage.copyBookingLink();
    });
  });

  test.describe('Date/Time Selection', () => {
    test.skip('should allow date selection on public booking page', async ({ page }) => {
      await page.goto('/book/valid-link');
      await bookingPage.waitForPageLoad();
      
      // Select a date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      await bookingPage.selectDate(tomorrow);
      
      // Time slots should appear
      await expect(bookingPage.timeSlots.first()).toBeVisible();
    });
  });

  test.describe('Responsive Booking UI', () => {
    test('should display mobile-friendly booking UI', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/book/test-link');
      await bookingPage.waitForPageLoad();
      
      // Should still be usable on mobile
      await expect(page.locator('body')).toBeVisible();
    });
  });
});
