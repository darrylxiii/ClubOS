import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Profile Page Object Model
 * Handles user profile management
 */
export class ProfilePage extends BasePage {
  readonly profileHeader: Locator;
  readonly avatarImage: Locator;
  readonly avatarUploadButton: Locator;
  readonly editProfileButton: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  
  // Profile fields
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly emailInput: Locator;
  readonly phoneInput: Locator;
  readonly bioInput: Locator;
  readonly locationInput: Locator;
  readonly linkedInInput: Locator;
  readonly portfolioInput: Locator;
  
  // Skills section
  readonly skillsSection: Locator;
  readonly addSkillButton: Locator;
  readonly skillInput: Locator;
  
  // Experience section
  readonly experienceSection: Locator;
  readonly addExperienceButton: Locator;

  constructor(page: Page) {
    super(page);
    this.profileHeader = page.locator('[data-testid="profile-header"], h1:has-text("Profile")').first();
    this.avatarImage = page.locator('[data-testid="avatar"], img[alt*="avatar"], img[alt*="profile"]').first();
    this.avatarUploadButton = page.locator('button:has-text("Upload"), button:has-text("Change Photo")').first();
    this.editProfileButton = page.getByRole('button', { name: /edit.*profile|edit/i }).first();
    this.saveButton = page.getByRole('button', { name: /save/i });
    this.cancelButton = page.getByRole('button', { name: /cancel/i });
    
    this.firstNameInput = page.getByLabel(/first.*name/i);
    this.lastNameInput = page.getByLabel(/last.*name/i);
    this.emailInput = page.getByLabel(/email/i);
    this.phoneInput = page.getByLabel(/phone/i);
    this.bioInput = page.getByLabel(/bio|about/i);
    this.locationInput = page.getByLabel(/location|city/i);
    this.linkedInInput = page.getByLabel(/linkedin/i);
    this.portfolioInput = page.getByLabel(/portfolio|website/i);
    
    this.skillsSection = page.locator('[data-testid="skills-section"], text=/skills/i').first();
    this.addSkillButton = page.getByRole('button', { name: /add.*skill/i });
    this.skillInput = page.locator('input[placeholder*="skill"]');
    
    this.experienceSection = page.locator('[data-testid="experience-section"], text=/experience/i').first();
    this.addExperienceButton = page.getByRole('button', { name: /add.*experience/i });
  }

  async navigateToProfile() {
    await this.goto('/profile');
  }

  async navigateToClubProfile() {
    await this.goto('/club-profile');
  }

  async expectProfilePage() {
    await expect(this.page).toHaveURL(/profile/);
    await this.waitForPageLoad();
  }

  async startEditing() {
    if (await this.editProfileButton.isVisible()) {
      await this.editProfileButton.click();
    }
  }

  async saveProfile() {
    await this.saveButton.click();
    await this.waitForToast();
  }

  async cancelEditing() {
    await this.cancelButton.click();
  }

  async updateFirstName(name: string) {
    await this.firstNameInput.fill(name);
  }

  async updateLastName(name: string) {
    await this.lastNameInput.fill(name);
  }

  async updatePhone(phone: string) {
    await this.phoneInput.fill(phone);
  }

  async updateBio(bio: string) {
    await this.bioInput.fill(bio);
  }

  async updateLocation(location: string) {
    await this.locationInput.fill(location);
  }

  async updateLinkedIn(url: string) {
    await this.linkedInInput.fill(url);
  }

  async updatePortfolio(url: string) {
    await this.portfolioInput.fill(url);
  }

  async uploadAvatar(filePath: string) {
    await this.avatarUploadButton.click();
    const fileInput = this.page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
    await this.waitForPageLoad();
  }

  async addSkill(skill: string) {
    await this.addSkillButton.click();
    await this.skillInput.fill(skill);
    await this.page.keyboard.press('Enter');
  }

  async removeSkill(skill: string) {
    const skillTag = this.page.locator(`[data-testid="skill-tag"]:has-text("${skill}"), button:has-text("${skill}")`);
    const removeButton = skillTag.locator('button, [aria-label="Remove"]');
    if (await removeButton.isVisible()) {
      await removeButton.click();
    }
  }

  async getProfileData(): Promise<{
    firstName: string;
    lastName: string;
    email: string;
  }> {
    return {
      firstName: await this.firstNameInput.inputValue().catch(() => ''),
      lastName: await this.lastNameInput.inputValue().catch(() => ''),
      email: await this.emailInput.inputValue().catch(() => ''),
    };
  }

  async updateFullProfile(data: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    bio?: string;
    location?: string;
  }) {
    await this.startEditing();
    
    if (data.firstName) await this.updateFirstName(data.firstName);
    if (data.lastName) await this.updateLastName(data.lastName);
    if (data.phone) await this.updatePhone(data.phone);
    if (data.bio) await this.updateBio(data.bio);
    if (data.location) await this.updateLocation(data.location);
    
    await this.saveProfile();
  }
}
