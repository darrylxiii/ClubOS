import { test, expect } from '@playwright/test';
import { CRMPage } from '../page-objects/CRMPage';

test.describe('CRM Flow', () => {
  let crmPage: CRMPage;

  test.beforeEach(async ({ page }) => {
    crmPage = new CRMPage(page);
  });

  test.describe('CRM Access', () => {
    test('should require authentication', async ({ page }) => {
      await crmPage.navigateToCRM();
      
      // Should redirect to auth
      await expect(page).toHaveURL(/auth/);
    });
  });

  test.describe('CRM Pipeline', () => {
    test.skip('should display CRM pipeline board', async ({ page }) => {
      // Would need authenticated admin/strategist session
      await crmPage.navigateToCRM();
      await crmPage.expectCRMLoaded();
    });

    test.skip('should display pipeline stages', async ({ page }) => {
      await crmPage.navigateToCRM();
      await crmPage.expectCRMLoaded();
      
      // Should have multiple stages
      const stageCount = await crmPage.stageColumn.count();
      expect(stageCount).toBeGreaterThan(0);
    });
  });

  test.describe('Prospect Management', () => {
    test.skip('should create a new prospect', async ({ page }) => {
      await crmPage.navigateToCRM();
      await crmPage.expectCRMLoaded();
      
      await crmPage.createProspect({
        name: 'Test Prospect',
        email: 'prospect@test.com',
        company: 'Test Company'
      });
      
      // Should see the new prospect
    });

    test.skip('should open prospect details', async ({ page }) => {
      await crmPage.navigateToCRM();
      await crmPage.expectCRMLoaded();
      
      const hasProspect = await crmPage.prospectCard.first().isVisible();
      if (hasProspect) {
        await crmPage.clickProspect();
        await expect(crmPage.prospectDetailPanel).toBeVisible();
      }
    });
  });

  test.describe('Drag and Drop', () => {
    test.skip('should move prospect between stages', async ({ page }) => {
      await crmPage.navigateToCRM();
      await crmPage.expectCRMLoaded();
      
      const hasProspect = await crmPage.prospectCard.first().isVisible();
      if (hasProspect) {
        await crmPage.dragProspectToStage(0, 1);
        await crmPage.waitForToast();
      }
    });
  });

  test.describe('Activity Logging', () => {
    test.skip('should log an activity', async ({ page }) => {
      await crmPage.navigateToCRM();
      await crmPage.expectCRMLoaded();
      
      const hasProspect = await crmPage.prospectCard.first().isVisible();
      if (hasProspect) {
        await crmPage.clickProspect();
        await crmPage.logActivity('call', 'Had a discovery call');
      }
    });
  });

  test.describe('Search and Filter', () => {
    test.skip('should search prospects', async ({ page }) => {
      await crmPage.navigateToCRM();
      await crmPage.expectCRMLoaded();
      
      await crmPage.searchProspects('test');
      await crmPage.waitForPageLoad();
    });
  });
});
