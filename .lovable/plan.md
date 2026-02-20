
# Fix: GIF Broken Image + Content Cut Off

## Two Precise Root Causes Found

### Bug 1: Blue Dot / Question Mark (Broken GIF)

The GIF file lives in `public/email-header.gif` which is served from the Lovable/published app URL. The code references it via `EMAIL_ASSETS_BASE_URL = 'https://thequantumclub.app'`, producing the URL `https://thequantumclub.app/email-header.gif`.

That domain (`thequantumclub.app`) does NOT serve the `public/` folder — the Lovable app does. So every email client that tries to load the image hits a 404, and displays the broken image placeholder (blue dot + white question mark).

The fix is a two-part approach:
- Change `EMAIL_ASSETS_BASE_URL` for the GIF to point to the correct URL where the GIF is actually reachable by external email clients. The GIF needs to be referenced from either the published Lovable app URL (`https://thequantumclub.lovable.app/email-header.gif`) OR — better — use an absolute raw CDN URL from a reliable host.
- The safest permanent fix: use the Lovable published URL `https://thequantumclub.lovable.app/email-header.gif` as the `EMAIL_HEADER_GIF` constant. This is publicly reachable by any email client anywhere in the world, no extra hosting setup needed.

### Bug 2: Content Cut Off / Invisible Mid-Sentence

The `Heading` and `Paragraph` components in `components.ts` hardcode `color: ${EMAIL_COLORS.textPrimary}` (`#F5F4EF` — near-white ivory) as inline styles on every text element. Inline styles always win over CSS class overrides in email clients.

Since the email body is now white (`#ffffff`), near-white text (`#F5F4EF`) is effectively invisible — it renders as white-on-white. Some email clients skip invisible runs entirely, causing the "cut off mid-sentence" appearance.

The fix: update `EMAIL_COLORS.textPrimary` to a dark color (`#0E0E10`) in `email-config.ts` so it is legible on white backgrounds, and update `textSecondary` and `textMuted` from their current dark-theme values to light-theme-appropriate values. These changes cascade to every component automatically.

---

## Exact Changes (3 Files Only)

### File 1: `supabase/functions/_shared/email-config.ts`

Two changes:

**A. Fix GIF URL** — change `EMAIL_HEADER_GIF` to use the published Lovable URL instead of `thequantumclub.app`:

```
// Before
export const EMAIL_HEADER_GIF = `${EMAIL_ASSETS_BASE_URL}/email-header.gif`;

// After
export const EMAIL_HEADER_GIF = 'https://thequantumclub.lovable.app/email-header.gif';
```

**B. Fix text color tokens** — update `EMAIL_COLORS` from dark-theme defaults to light-theme defaults:

```
// Before
textPrimary: '#F5F4EF',    // near-white — invisible on white body
textSecondary: '#B8B7B3',  // light gray — invisible on white body
textMuted: '#8A8985',      // medium gray — barely visible on white body

// After
textPrimary: '#0E0E10',    // near-black — fully legible on white
textSecondary: '#555555',  // dark gray — clearly legible on white
textMuted: '#888888',      // medium-dark gray — legible on white
```

Note: The dark-mode `@media (prefers-color-scheme: dark)` block in `base-template.ts` already overrides these back to the original light-on-dark values for dark-mode recipients — so dark mode is not broken.

### File 2: `supabase/functions/_shared/email-templates/base-template.ts`

Update the dark-mode media query to correctly restore the original ivory colors for dark-mode recipients (since we just changed the defaults):

```
// Dark mode override (already exists in the file — just update the values)
@media (prefers-color-scheme: dark) {
  .text-primary  { color: #F5F4EF !important; }   // restore ivory for dark
  .text-secondary { color: #B8B7B3 !important; }
  .text-muted    { color: #8A8985 !important; }
}
```

Also ensure the `onerror` fallback on the GIF `<img>` tag is cleaned up — `onerror` JavaScript does not execute in most email clients, so the fallback div approach should use VML/conditional comments instead of JavaScript. Simplify to just a clean `alt` text fallback with no `onerror` attribute (email clients ignore it and it adds noise to the HTML).

### File 3: `src/components/admin/EmailTemplatePreview.tsx`

The admin preview hardcodes `EMAIL_HEADER_GIF = "https://thequantumclub.app/email-header.gif"` at the top of the file (the same broken URL). Update it to the correct URL so the admin preview also shows the GIF correctly:

```
// Before
const EMAIL_HEADER_GIF = "https://thequantumclub.app/email-header.gif";

// After
const EMAIL_HEADER_GIF = "https://thequantumclub.lovable.app/email-header.gif";
```

---

## What Gets Fixed

| Issue | Root Cause | Fix |
|---|---|---|
| Blue dot + ? (broken GIF) | `thequantumclub.app` does not serve `public/` assets | Point to `thequantumclub.lovable.app/email-header.gif` (correct public URL) |
| Content cut off / invisible | `textPrimary: #F5F4EF` (white text) on white body | Update color tokens to dark values (`#0E0E10`, `#555555`, `#888888`) |
| Admin preview also shows broken GIF | Same wrong URL hardcoded in `EmailTemplatePreview.tsx` | Update the constant in that file |

---

## After the Fix: Deployment

All three files are in the shared layer used by every email function. After the fix, the `send-test-email` function will be redeployed automatically and a fresh test email to `darryl@thequantumclub.nl` will be sent to confirm both issues are resolved.

No database changes needed. No new dependencies. No new secrets needed.
