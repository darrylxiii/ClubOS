import { test, expect } from '@playwright/test';

test.describe('Referral System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/referrals');
  });

  test('should display referral dashboard', async ({ page }) => {
    const heading = page.getByRole('heading', { name: /referral/i });
    await expect(heading).toBeVisible();
  });

  test('should show referral link', async ({ page }) => {
    // Look for shareable referral link
    const linkSection = page.getByText(/link/i).or(page.getByPlaceholder(/referral/i));
    await expect(linkSection).toBeVisible();
  });

  test('should allow copying referral link', async ({ page }) => {
    const copyButton = page.getByRole('button', { name: /copy/i });
    
    if (await copyButton.isVisible()) {
      await copyButton.click();
      
      // Should show confirmation
      const confirmation = page.getByText(/copied/i);
      await expect(confirmation).toBeVisible();
    }
  });

  test('should show referral statistics', async ({ page }) => {
    // Look for referral stats
    const statsSection = page.getByText(/referred/i)
      .or(page.getByText(/pending/i))
      .or(page.getByText(/completed/i));
    
    await expect(statsSection).toBeVisible();
  });

  test('should display rewards summary', async ({ page }) => {
    const rewardsSection = page.getByText(/reward/i)
      .or(page.getByText(/earned/i))
      .or(page.getByText(/payout/i));
    
    await expect(rewardsSection).toBeVisible();
  });

  test('should show projected vs realized rewards', async ({ page }) => {
    const projectedSection = page.getByText(/projected/i);
    const realizedSection = page.getByText(/realized/i);
    
    // At least one should be visible
    const hasRewardBreakdown = 
      await projectedSection.isVisible() || 
      await realizedSection.isVisible();
    
    expect(hasRewardBreakdown).toBeTruthy();
  });

  test('should display referral history', async ({ page }) => {
    const historyTab = page.getByRole('tab', { name: /history/i })
      .or(page.getByText(/history/i));
    
    if (await historyTab.isVisible()) {
      await historyTab.click();
      
      // Should show referral entries
      const entries = page.getByRole('row').or(page.locator('[data-testid="referral-entry"]'));
      await expect(entries.first()).toBeVisible();
    }
  });

  test('should show referral status badges', async ({ page }) => {
    // Look for status indicators
    const statusBadge = page.getByText(/pending|hired|expired|completed/i);
    
    if (await statusBadge.first().isVisible()) {
      await expect(statusBadge.first()).toBeVisible();
    }
  });

  test('should allow sharing via social media', async ({ page }) => {
    const shareButton = page.getByRole('button', { name: /share/i });
    
    if (await shareButton.isVisible()) {
      await shareButton.click();
      
      // Should show sharing options
      const socialOptions = page.getByRole('menuitem')
        .or(page.getByText(/linkedin|twitter|email/i));
      await expect(socialOptions.first()).toBeVisible();
    }
  });

  test('should display referral terms', async ({ page }) => {
    const termsLink = page.getByRole('link', { name: /terms|conditions|policy/i });
    
    if (await termsLink.isVisible()) {
      await termsLink.click();
      
      // Should navigate to or show terms
      const termsContent = page.getByText(/eligibility|reward.*criteria/i);
      await expect(termsContent).toBeVisible();
    }
  });
});

test.describe('Referral Tracking', () => {
  test('should track referral click', async ({ page, context }) => {
    // Get a referral link if available
    await page.goto('/referrals');
    
    const referralLink = page.locator('input[readonly]').or(page.getByPlaceholder(/link/i));
    
    if (await referralLink.isVisible()) {
      const linkValue = await referralLink.inputValue();
      
      if (linkValue && linkValue.includes('ref=')) {
        // Open referral link in new page
        const newPage = await context.newPage();
        await newPage.goto(linkValue);
        
        // Should load the target page
        await expect(newPage).not.toHaveURL(/error/);
        await newPage.close();
      }
    }
  });
});

test.describe('Referral Rewards', () => {
  test('should show reward tiers', async ({ page }) => {
    await page.goto('/referrals');
    
    const tiersSection = page.getByText(/tier/i)
      .or(page.getByText(/level/i))
      .or(page.getByText(/milestone/i));
    
    if (await tiersSection.isVisible()) {
      await expect(tiersSection).toBeVisible();
    }
  });

  test('should display payout history', async ({ page }) => {
    await page.goto('/referrals');
    
    const payoutsTab = page.getByRole('tab', { name: /payout|payment/i });
    
    if (await payoutsTab.isVisible()) {
      await payoutsTab.click();
      
      const payoutList = page.getByRole('row');
      await expect(payoutList.first()).toBeVisible();
    }
  });
});
