import { chromium, Browser, Page, BrowserContext } from 'playwright';

export class ScoutBot {
    private browser: Browser | null = null;
    private context: BrowserContext | null = null;
    private page: Page | null = null;

    constructor(
        private botName: string = 'Scout',
        private headless: boolean = true
    ) { }

    async initialize() {
        this.browser = await chromium.launch({
            headless: this.headless,
            args: [
                '--use-fake-ui-for-media-stream',
                '--use-fake-device-for-media-stream',
                '--disable-blink-features=AutomationControlled',
            ]
        });

        this.context = await this.browser.newContext({
            permissions: ['microphone', 'camera'],
            viewport: { width: 1280, height: 720 },
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        });

        this.page = await this.context.newPage();
    }

    async joinMeeting(url: string) {
        if (!this.page) throw new Error('Bot not initialized');

        console.log(`[Scout] Navigating to ${url}`);
        await this.page.goto(url);

        if (url.includes('zoom.us')) {
            await this.joinZoom();
        } else if (url.includes('meet.google.com')) {
            await this.joinGoogleMeet();
        } else {
            console.error('Unsupported platform');
        }
    }

    private async joinZoom() {
        if (!this.page) return;

        // Zoom Web Client logic
        // 1. Handle "Launch Meeting" page
        // 2. Click "Join from Your Browser" (often hidden)

        try {
            // Wait for potential redirect or launch button
            await this.page.waitForSelector('div[role="main"]', { timeout: 10000 }).catch(() => { });

            // Look for "Join from Your Browser"
            const joinBrowserLink = await this.page.getByRole('link', { name: /join from your browser/i });
            if (await joinBrowserLink.isVisible()) {
                await joinBrowserLink.click();
            } else {
                // Sometimes it's inside the "launch" logic, might need to fail launch first
                console.log('Attempting to find Join from Browser link...');
            }

            // Input Name
            await this.page.waitForSelector('input[name="inputname"]');
            await this.page.fill('input[name="inputname"]', this.botName);

            // Click Join
            await this.page.click('button[type="button"].btn-primary');

            // Handle Audio/Video permissions if not auto-accepted (Context handles this mostly)
            console.log('[Scout] Joined Zoom Lobby/Meeting');
        } catch (err) {
            console.error('[Scout] Error joining Zoom:', err);
        }
    }

    private async joinGoogleMeet() {
        if (!this.page) return;

        try {
            // Google Meet Guest Logic
            // Note: Google Meet often requires login. Guest access might be disabled by orgs.

            // Detecting "Ask to join" or Login prompt
            const nameInput = await this.page.$('input[placeholder="Your name"]');
            if (nameInput) {
                await nameInput.fill(this.botName);
                await this.page.click('span:has-text("Ask to join")');
                console.log('[Scout] Asked to join Google Meet');
            } else {
                console.log('[Scout] Login might be required for this Meet link');
            }
        } catch (err) {
            console.error('[Scout] Error joining Google Meet:', err);
        }
    }

    async teardown() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
}

// Example usage if run directly
if (require.main === module) {
    (async () => {
        const bot = new ScoutBot('Scout-Pro', false); // Headful for local testing
        await bot.initialize();
        const url = process.argv[2];
        if (url) {
            await bot.joinMeeting(url);
        } else {
            console.log('Please provide a URL');
            await bot.teardown();
        }
    })();
}
