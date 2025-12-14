import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Booking Page Object Model
 * Handles booking link creation, scheduling, and management
 */
export class BookingPage extends BasePage {
  readonly createBookingButton: Locator;
  readonly bookingLinksList: Locator;
  readonly bookingCard: Locator;
  readonly titleInput: Locator;
  readonly durationSelect: Locator;
  readonly descriptionInput: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly calendarView: Locator;
  readonly timeSlots: Locator;
  readonly confirmBookingButton: Locator;

  constructor(page: Page) {
    super(page);
    this.createBookingButton = page.getByRole('button', { name: /create booking|new booking/i });
    this.bookingLinksList = page.locator('[data-testid="booking-links-list"]');
    this.bookingCard = page.locator('[data-testid="booking-card"]');
    this.titleInput = page.getByLabel(/title|name/i);
    this.durationSelect = page.getByLabel(/duration/i);
    this.descriptionInput = page.getByLabel(/description/i);
    this.saveButton = page.getByRole('button', { name: /save|create/i });
    this.cancelButton = page.getByRole('button', { name: /cancel/i });
    this.calendarView = page.locator('[data-testid="calendar-view"]');
    this.timeSlots = page.locator('[data-testid="time-slot"]');
    this.confirmBookingButton = page.getByRole('button', { name: /confirm|book/i });
  }

  async navigateToBookings() {
    await this.goto('/bookings');
  }

  async createBookingLink(title: string, duration: string, description?: string) {
    await this.createBookingButton.click();
    await this.titleInput.fill(title);
    await this.durationSelect.selectOption(duration);
    if (description) {
      await this.descriptionInput.fill(description);
    }
    await this.saveButton.click();
    await this.waitForToast();
  }

  async selectDate(date: Date) {
    const day = date.getDate().toString();
    await this.page.getByRole('button', { name: day, exact: true }).click();
  }

  async selectTimeSlot(index: number = 0) {
    await this.timeSlots.nth(index).click();
  }

  async confirmBooking() {
    await this.confirmBookingButton.click();
    await this.waitForToast();
  }

  async expectBookingLinksVisible() {
    await expect(this.bookingCard.first()).toBeVisible({ timeout: 15000 });
  }

  async getBookingLinkCount(): Promise<number> {
    return await this.bookingCard.count();
  }

  async copyBookingLink() {
    await this.page.getByRole('button', { name: /copy link/i }).first().click();
    await this.waitForToast('Copied');
  }

  async deleteBookingLink() {
    await this.page.getByRole('button', { name: /delete/i }).first().click();
    await this.page.getByRole('button', { name: /confirm|yes/i }).click();
    await this.waitForToast();
  }
}
