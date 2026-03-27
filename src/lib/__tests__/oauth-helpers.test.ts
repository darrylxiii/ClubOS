import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---- Supabase mock ----
const { mockSignInWithOAuth } = vi.hoisted(() => ({
  mockSignInWithOAuth: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithOAuth: mockSignInWithOAuth,
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
    })),
  },
}));

// ---- Import the module under test ----
import { isCustomDomain, signInWithOAuthCustomDomain } from '@/lib/oauth-helpers';

describe('oauth-helpers', () => {
  let originalHostname: string;

  beforeEach(() => {
    vi.clearAllMocks();
    originalHostname = window.location.hostname;
  });

  afterEach(() => {
    // Restore hostname
    Object.defineProperty(window, 'location', {
      value: { ...window.location, hostname: originalHostname, href: window.location.href },
      writable: true,
    });
  });

  // ---------------------------------------------------------------------------
  // isCustomDomain
  // ---------------------------------------------------------------------------
  describe('isCustomDomain', () => {
    it('should return false when running on localhost', () => {
      Object.defineProperty(window, 'location', {
        value: { ...window.location, hostname: 'localhost' },
        writable: true,
      });
      expect(isCustomDomain()).toBe(false);
    });

    it('should return true when running on a custom domain', () => {
      Object.defineProperty(window, 'location', {
        value: { ...window.location, hostname: 'app.thequantumclub.com' },
        writable: true,
      });
      expect(isCustomDomain()).toBe(true);
    });

    it('should return false for localhost with a port suffix in hostname', () => {
      // hostname property does NOT include port, but just to be safe
      Object.defineProperty(window, 'location', {
        value: { ...window.location, hostname: 'localhost' },
        writable: true,
      });
      expect(isCustomDomain()).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // validateOAuthUrl (tested indirectly through signInWithOAuthCustomDomain)
  //
  // The validateOAuthUrl function is a module-level const and is NOT exported.
  // We test its behavior by invoking signInWithOAuthCustomDomain on a custom
  // domain, where it calls supabase.auth.signInWithOAuth with
  // skipBrowserRedirect:true, inspects the returned URL, and validates it.
  // ---------------------------------------------------------------------------
  describe('OAuth URL validation (via signInWithOAuthCustomDomain)', () => {
    // Force isCustomDomain() to return true for these tests
    beforeEach(() => {
      Object.defineProperty(window, 'location', {
        value: { hostname: 'app.thequantumclub.com', href: '' },
        writable: true,
      });
    });

    it('should accept linkedin.com as a valid OAuth URL', async () => {
      mockSignInWithOAuth.mockResolvedValue({
        data: { url: 'https://linkedin.com/oauth/authorize?state=abc' },
        error: null,
      });

      await signInWithOAuthCustomDomain({
        provider: 'linkedin_oidc',
        redirectTo: 'https://app.thequantumclub.com/auth/callback',
      });

      // If the URL was valid, window.location.href is set
      expect(window.location.href).toBe(
        'https://linkedin.com/oauth/authorize?state=abc'
      );
    });

    it('should accept www.linkedin.com as a valid OAuth URL', async () => {
      mockSignInWithOAuth.mockResolvedValue({
        data: { url: 'https://www.linkedin.com/oauth/authorize?state=abc' },
        error: null,
      });

      await signInWithOAuthCustomDomain({
        provider: 'linkedin_oidc',
        redirectTo: 'https://app.thequantumclub.com/auth/callback',
      });

      expect(window.location.href).toBe(
        'https://www.linkedin.com/oauth/authorize?state=abc'
      );
    });

    it('should accept *.supabase.co subdomains as valid OAuth URLs', async () => {
      mockSignInWithOAuth.mockResolvedValue({
        data: {
          url: 'https://chgrkvftjfibufoopmav.supabase.co/auth/v1/authorize?provider=linkedin_oidc',
        },
        error: null,
      });

      await signInWithOAuthCustomDomain({
        provider: 'linkedin_oidc',
        redirectTo: 'https://app.thequantumclub.com/auth/callback',
      });

      expect(window.location.href).toBe(
        'https://chgrkvftjfibufoopmav.supabase.co/auth/v1/authorize?provider=linkedin_oidc'
      );
    });

    it('should REJECT evil-linkedin.com (hostname spoofing)', async () => {
      mockSignInWithOAuth.mockResolvedValue({
        data: { url: 'https://evil-linkedin.com/phish?steal=token' },
        error: null,
      });

      await expect(
        signInWithOAuthCustomDomain({
          provider: 'linkedin_oidc',
          redirectTo: 'https://app.thequantumclub.com/auth/callback',
        })
      ).rejects.toThrow('Invalid OAuth redirect URL');
    });

    it('should REJECT evil.com', async () => {
      mockSignInWithOAuth.mockResolvedValue({
        data: { url: 'https://evil.com/steal-token' },
        error: null,
      });

      await expect(
        signInWithOAuthCustomDomain({
          provider: 'linkedin_oidc',
          redirectTo: 'https://app.thequantumclub.com/auth/callback',
        })
      ).rejects.toThrow('Invalid OAuth redirect URL');
    });

    it('should REJECT linkedin.com.evil.com (subdomain attack)', async () => {
      mockSignInWithOAuth.mockResolvedValue({
        data: { url: 'https://linkedin.com.evil.com/phish' },
        error: null,
      });

      await expect(
        signInWithOAuthCustomDomain({
          provider: 'linkedin_oidc',
          redirectTo: 'https://app.thequantumclub.com/auth/callback',
        })
      ).rejects.toThrow('Invalid OAuth redirect URL');
    });

    it('should REJECT supabase.co.evil.com (subdomain of non-supabase domain)', async () => {
      mockSignInWithOAuth.mockResolvedValue({
        data: { url: 'https://supabase.co.evil.com/phish' },
        error: null,
      });

      await expect(
        signInWithOAuthCustomDomain({
          provider: 'linkedin_oidc',
          redirectTo: 'https://app.thequantumclub.com/auth/callback',
        })
      ).rejects.toThrow('Invalid OAuth redirect URL');
    });

    it('should REJECT invalid URLs (not a real URL)', async () => {
      mockSignInWithOAuth.mockResolvedValue({
        data: { url: 'not-a-valid-url' },
        error: null,
      });

      await expect(
        signInWithOAuthCustomDomain({
          provider: 'linkedin_oidc',
          redirectTo: 'https://app.thequantumclub.com/auth/callback',
        })
      ).rejects.toThrow('Invalid OAuth redirect URL');
    });

    it('should throw when no OAuth URL is returned', async () => {
      mockSignInWithOAuth.mockResolvedValue({
        data: { url: null },
        error: null,
      });

      await expect(
        signInWithOAuthCustomDomain({
          provider: 'linkedin_oidc',
          redirectTo: 'https://app.thequantumclub.com/auth/callback',
        })
      ).rejects.toThrow('No OAuth URL returned');
    });

    it('should throw when supabase returns an error', async () => {
      const authError = new Error('OAuth config error');
      mockSignInWithOAuth.mockResolvedValue({
        data: null,
        error: authError,
      });

      await expect(
        signInWithOAuthCustomDomain({
          provider: 'linkedin_oidc',
          redirectTo: 'https://app.thequantumclub.com/auth/callback',
        })
      ).rejects.toThrow('OAuth config error');
    });
  });

  // ---------------------------------------------------------------------------
  // signInWithOAuthCustomDomain on localhost (non-custom domain)
  // ---------------------------------------------------------------------------
  describe('signInWithOAuthCustomDomain on localhost', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'location', {
        value: { hostname: 'localhost', href: '' },
        writable: true,
      });
    });

    it('should call signInWithOAuth WITHOUT skipBrowserRedirect on localhost', async () => {
      mockSignInWithOAuth.mockResolvedValue({
        data: { url: 'https://linkedin.com/oauth/authorize' },
        error: null,
      });

      await signInWithOAuthCustomDomain({
        provider: 'linkedin_oidc',
        redirectTo: 'http://localhost:3000/auth/callback',
      });

      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'linkedin_oidc',
        options: {
          redirectTo: 'http://localhost:3000/auth/callback',
          scopes: undefined,
        },
      });

      // Should NOT have skipBrowserRedirect in the call
      const callArgs = mockSignInWithOAuth.mock.calls[0][0];
      expect(callArgs.options.skipBrowserRedirect).toBeUndefined();
    });

    it('should call signInWithOAuth WITH skipBrowserRedirect on custom domain', async () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: 'app.thequantumclub.com', href: '' },
        writable: true,
      });

      mockSignInWithOAuth.mockResolvedValue({
        data: { url: 'https://www.linkedin.com/oauth/authorize?state=xyz' },
        error: null,
      });

      await signInWithOAuthCustomDomain({
        provider: 'linkedin_oidc',
        redirectTo: 'https://app.thequantumclub.com/auth/callback',
        scopes: 'openid profile email',
      });

      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'linkedin_oidc',
        options: {
          redirectTo: 'https://app.thequantumclub.com/auth/callback',
          skipBrowserRedirect: true,
          scopes: 'openid profile email',
        },
      });
    });
  });
});
