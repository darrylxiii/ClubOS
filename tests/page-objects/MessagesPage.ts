import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Messages Page Object Model
 * Handles messaging, conversations, and real-time chat
 */
export class MessagesPage extends BasePage {
  readonly conversationsList: Locator;
  readonly conversationItem: Locator;
  readonly messageInput: Locator;
  readonly sendButton: Locator;
  readonly messagesList: Locator;
  readonly messageItem: Locator;
  readonly newConversationButton: Locator;
  readonly searchInput: Locator;
  readonly attachmentButton: Locator;
  readonly callButton: Locator;
  readonly videoCallButton: Locator;

  constructor(page: Page) {
    super(page);
    this.conversationsList = page.locator('[data-testid="conversations-list"]');
    this.conversationItem = page.locator('[data-testid="conversation-item"]');
    this.messageInput = page.getByPlaceholder(/type a message|write a message/i);
    this.sendButton = page.getByRole('button', { name: /send/i });
    this.messagesList = page.locator('[data-testid="messages-list"]');
    this.messageItem = page.locator('[data-testid="message-item"]');
    this.newConversationButton = page.getByRole('button', { name: /new conversation|new message/i });
    this.searchInput = page.getByPlaceholder(/search conversations/i);
    this.attachmentButton = page.getByRole('button', { name: /attach/i });
    this.callButton = page.getByRole('button', { name: /call|voice/i });
    this.videoCallButton = page.getByRole('button', { name: /video/i });
  }

  async navigateToMessages() {
    await this.goto('/messages');
  }

  async selectConversation(index: number = 0) {
    await this.conversationItem.nth(index).click();
    await this.waitForPageLoad();
  }

  async sendMessage(text: string) {
    await this.messageInput.fill(text);
    await this.sendButton.click();
    await this.waitForPageLoad();
  }

  async expectMessageSent(text: string) {
    await expect(this.messageItem.filter({ hasText: text })).toBeVisible();
  }

  async startNewConversation() {
    await this.newConversationButton.click();
  }

  async searchConversations(query: string) {
    await this.searchInput.fill(query);
    await this.waitForPageLoad();
  }

  async getConversationCount(): Promise<number> {
    return await this.conversationItem.count();
  }

  async expectConversationsLoaded() {
    await this.waitForNoLoading();
    // Either conversations exist or empty state
    const hasConversations = await this.conversationItem.first().isVisible().catch(() => false);
    const hasEmptyState = await this.page.getByText(/no conversations|start a conversation/i).isVisible().catch(() => false);
    expect(hasConversations || hasEmptyState).toBe(true);
  }

  async initiateCall() {
    await this.callButton.click();
  }

  async initiateVideoCall() {
    await this.videoCallButton.click();
  }
}
