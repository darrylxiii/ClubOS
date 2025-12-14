import { test, expect } from '@playwright/test';
import { MessagesPage } from '../page-objects/MessagesPage';

test.describe('Messaging Flow', () => {
  let messagesPage: MessagesPage;

  test.beforeEach(async ({ page }) => {
    messagesPage = new MessagesPage(page);
  });

  test.describe('Messages Access', () => {
    test('should require authentication', async ({ page }) => {
      await messagesPage.navigateToMessages();
      
      // Should redirect to auth
      await expect(page).toHaveURL(/auth/);
    });
  });

  test.describe('Conversations List', () => {
    test.skip('should display conversations list', async ({ page }) => {
      // Would need authenticated session
      await messagesPage.navigateToMessages();
      await messagesPage.expectConversationsLoaded();
    });

    test.skip('should allow searching conversations', async ({ page }) => {
      await messagesPage.navigateToMessages();
      await messagesPage.expectConversationsLoaded();
      
      await messagesPage.searchConversations('test');
      await messagesPage.waitForPageLoad();
    });
  });

  test.describe('Message Sending', () => {
    test.skip('should send a message', async ({ page }) => {
      await messagesPage.navigateToMessages();
      await messagesPage.expectConversationsLoaded();
      
      const hasConversation = await messagesPage.conversationItem.first().isVisible();
      if (hasConversation) {
        await messagesPage.selectConversation();
        await messagesPage.sendMessage('Test message from E2E');
        await messagesPage.expectMessageSent('Test message from E2E');
      }
    });
  });

  test.describe('New Conversation', () => {
    test.skip('should open new conversation dialog', async ({ page }) => {
      await messagesPage.navigateToMessages();
      await messagesPage.waitForPageLoad();
      
      const hasNewBtn = await messagesPage.newConversationButton.isVisible();
      if (hasNewBtn) {
        await messagesPage.startNewConversation();
        await expect(page.locator('[role="dialog"]')).toBeVisible();
      }
    });
  });

  test.describe('Responsive Messages', () => {
    test.skip('should work on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await messagesPage.navigateToMessages();
      
      // Should adapt to mobile layout
      await expect(page.locator('body')).toBeVisible();
    });
  });
});
