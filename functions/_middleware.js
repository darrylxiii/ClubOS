/**
 * Cloudflare Pages Middleware — Security Headers + CSP Nonce Injection
 * 
 * Runs on every HTML request (static assets excluded via _routes.json).
 * Generates a per-request nonce and injects it into:
 *   1. Every <script> tag in the HTML via HTMLRewriter
 *   2. The Content-Security-Policy header
 * 
 * This replaces the static security headers in _headers for HTML responses,
 * because _headers cannot do dynamic nonce generation.
 */

// ─── CSP Directives ───
// Built as an array for readability, joined into a single header value.
function buildCSP(nonce) {
  return [
    // Default: only allow same-origin
    "default-src 'self'",

    // Scripts: self + nonce for inline scripts + strict-dynamic for GTM-loaded scripts
    // strict-dynamic allows scripts loaded by trusted (nonced) scripts to execute
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://www.googletagmanager.com https://www.google-analytics.com https://ddwl4m2hdecbv.cloudfront.net`,

    // Styles: self + unsafe-inline (Tailwind/Radix inject styles dynamically)
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",

    // Fonts: self + Google Fonts CDN
    "font-src 'self' https://fonts.gstatic.com data:",

    // Images: self + data URIs + blob + HTTPS (Supabase storage, external images)
    "img-src 'self' data: blob: https:",

    // Connect: API calls, WebSockets, analytics
    [
      "connect-src 'self'",
      "https://chgrkvftjfibufoopmav.supabase.co",
      "wss://chgrkvftjfibufoopmav.supabase.co",
      "https://eu.i.posthog.com",
      "https://us.i.posthog.com",
      "https://generativelanguage.googleapis.com",
      "https://fonts.googleapis.com",
      "https://www.google-analytics.com",
      "https://www.googletagmanager.com",
      "https://ddwl4m2hdecbv.cloudfront.net",
      "https://region1.google-analytics.com",
    ].join(' '),

    // Media: self + blob + HTTPS (video embeds, Supabase storage)
    "media-src 'self' blob: https:",

    // Frames: YouTube embeds, Google OAuth
    "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://accounts.google.com https://www.google.com",

    // Objects: none (no Flash/Java)
    "object-src 'none'",

    // Base URI: prevent injection attacks
    "base-uri 'self'",

    // Form submissions: only to self
    "form-action 'self' https://accounts.google.com",

    // Frame ancestors: never allow embedding (clickjacking protection)
    "frame-ancestors 'none'",

    // Workers: self (for service worker)
    "worker-src 'self' blob:",

    // Manifest: self (PWA)
    "manifest-src 'self'",

    // Upgrade HTTP requests to HTTPS
    "upgrade-insecure-requests",
  ].join('; ');
}

// ─── Security Headers ───
// Applied to ALL responses (HTML and static assets).
const SECURITY_HEADERS = {
  'Access-Control-Allow-Origin': 'https://os.thequantumclub.com',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  // same-origin-allow-popups: needed for Google OAuth popup flow
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'credentialless',
  // Explicitly disable browser features we don't use
  'Permissions-Policy': 'geolocation=(), midi=(), sync-xhr=(), accelerometer=(), gyroscope=(), magnetometer=(), payment=(), usb=(), camera=(self), microphone=(self), fullscreen=(self)',
  // Remove deprecated X-XSS-Protection (can cause issues on modern browsers)
  'X-XSS-Protection': '0',
};


export async function onRequest(context) {
  const response = await context.next();
  const contentType = response.headers.get('Content-Type') || '';

  // Clone headers so we can modify them
  const newHeaders = new Headers(response.headers);

  // Apply security headers to ALL responses
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    newHeaders.set(key, value);
  }

  // For HTML responses: inject CSP nonce
  if (contentType.includes('text/html')) {
    const nonce = crypto.randomUUID();

    // Set CSP header with the generated nonce
    newHeaders.set('Content-Security-Policy', buildCSP(nonce));

    // Use HTMLRewriter to inject nonce into all <script> tags
    const rewrittenResponse = new HTMLRewriter()
      .on('script', {
        element(element) {
          // Add nonce to all script tags (inline and external)
          element.setAttribute('nonce', nonce);
        },
      })
      .transform(new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      }));

    return rewrittenResponse;
  }

  // Non-HTML responses: return with security headers only (no CSP)
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}
