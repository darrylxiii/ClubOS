
# Integrating Your Canva GIF Header Into All Emails

## What You Have and What Needs to Change

You have uploaded a GIF (`Black_and_Beige_Modern_Minimalistic_Beauty_Email_Newsletter_2.gif`) — a black/beige animated header that fades into white. Based on the design description (black and beige, minimalistic, fading to white), this is a light-bodied email design.

The current email system has two distinct problems:

1. **`base-template.ts`** — the shared wrapper used by ~20 functions — has a dark (near-black `#0E0E10`) background. Your GIF fades to white, so the email body must flip to white to match. One file change cascades to all 20 emails.

2. **5 functions use raw hand-written HTML** and completely bypass `base-template.ts`. They will never get your GIF header unless individually migrated:
   - `send-approval-notification` — the most important email (first thing new members see)
   - `send-partner-welcome` — uses plain CSS, light body, no branding assets
   - `notify-admin-partner-request` — admin alerts, raw HTML
   - `provision-partner` — raw HTML automated provisioning email
   - `send-booking-reminder` — separate from the one already on the shared system

`send-verification-code` already uses `base-template.ts` correctly — no change needed there.

---

## The Complete Implementation

### Step 1 — Copy the GIF to the public folder

The GIF is uploaded at `user-uploads://Black_and_Beige_Modern_Minimalistic_Beauty_Email_Newsletter_2.gif`. It will be copied to `public/email-header.gif`. This makes it permanently accessible at `https://thequantumclub.app/email-header.gif` — which is the domain already used by `email-config.ts` for all hosted assets. No external hosting needed.

### Step 2 — Add the GIF URL to `email-config.ts`

Add a single export:

```
export const EMAIL_HEADER_GIF = `${EMAIL_ASSETS_BASE_URL}/email-header.gif`;
```

This is the one-line update point for all future header redesigns. Change the filename here and every email updates automatically.

### Step 3 — Rewrite `base-template.ts` — the core change

This single file controls ~20 emails. Three things change:

**A. Replace the code-generated header with the GIF image:**

The current header is a `<div>` with:
- Clover logo image (180px)
- "THE QUANTUM CLUB" text in gold
- "Exclusive Talent Network" subtitle

This entire header block (lines 203–235) is replaced with a single `<img>` tag rendering your GIF at full 600px container width, with zero top padding so the GIF starts at the very top edge of the email card:

```html
<tr>
  <td style="padding: 0; margin: 0; line-height: 0;">
    <a href="${appUrl}">
      <img 
        src="${EMAIL_HEADER_GIF}"
        alt="The Quantum Club"
        width="600"
        style="display: block; width: 100%; max-width: 600px; border: 0;"
      />
    </a>
  </td>
</tr>
```

Key technical decisions baked in:
- `width="600"` attribute + `width: 100%` CSS = pixel-perfect on desktop, fluid on mobile
- `line-height: 0` on the `<td>` eliminates the 4px gap that email clients (especially Outlook) insert below images
- `border: 0` prevents Outlook from adding a blue border around the linked image
- `alt="The Quantum Club"` for accessibility and for Outlook/corporate clients that block images — they will see the brand name as text fallback
- GIF animation: plays in Gmail, Apple Mail, iOS Mail, Outlook for Mac. Outlook Windows (2007-2019) shows only the first frame as a static image — since your GIF starts on the branded header frame, this is a clean graceful degradation

**B. Flip all background colors from dark to light:**

Since your design fades to white, the email body must be white. These token changes in `base-template.ts` cascade to all emails:

| CSS class / inline style | Before | After |
|---|---|---|
| `body` background | `#0E0E10` (eclipse) | `#f8f8f8` |
| `.email-wrapper` background | `#0E0E10` | `#f8f8f8` |
| `.email-container` background | `#1a1a1c` (cardBg) | `#ffffff` |
| `.gradient-header` (now removed) | dark gradient | replaced by GIF |
| `.text-primary` | `#F5F4EF` (ivory) | `#0E0E10` (eclipse) |
| `.text-secondary` | `#B8B7B3` | `#555555` |
| `.text-muted` | `#8A8985` | `#888888` |
| `.bg-card` border | `#3D3426` | `#e5e7eb` |
| Footer border | `rgba(0,0,0,0.2)` | `#f0f0f0` |
| Footer background | dark | `#fafafa` |

The `@media (prefers-color-scheme: light)` overrides that currently flip to white become the new default, and the dark-mode media query is updated to flip back to dark for recipients who use dark-mode on their device.

**C. Remove the `border-radius: 24px` on the container:**

The current container has rounded corners (`border-radius: 24px`). Your GIF fills the full top edge — rounded corners clip the GIF corners visually and look incorrect. The container `border-radius` is removed so the GIF renders edge-to-edge at the top. A subtle `box-shadow` is kept for the card lift effect.

**D. Update `card` and `highlight` components in `components.ts`:**

The `Card` component has `background-color: rgba(255, 255, 255, 0.03)` — invisible on a white background. Card backgrounds update to `#f5f5f5` and borders to `#e5e7eb` to be visible on white. The `Divider` border color updates from `#3D3426` (barely visible gold-tinted dark) to `#e5e7eb` (standard light divider).

### Step 4 — Migrate the 5 raw-HTML functions to `base-template.ts`

Each of these 5 functions replaces its entire raw HTML block with a call to `baseEmailTemplate({ content: ... })` using the shared component library:

**`send-approval-notification`** (433 lines → ~120 lines after migration):
- The approved/declined conditional logic stays
- The raw HTML for both states replaced with `Heading`, `Paragraph`, `Card`, `Button`, `AlertBox` components
- The existing magic link generation logic is preserved exactly — only the HTML rendering changes
- The gold "What's Next" box maps to `Card({ variant: 'highlight', content: ... })`

**`send-partner-welcome`** (218 lines → ~80 lines):
- Plain CSS header replaced with shared template
- Content preserved (partner name, company, invite code, magic link)

**`notify-admin-partner-request`**:
- Admin alert email migrated to shared template
- `AlertBox({ type: 'warning' })` used for the request notification

**`provision-partner`**:
- Automated provisioning email migrated to shared template

**`send-booking-reminder`** (the standalone one, not `send-booking-reminder-email` which is already on the shared system):
- Migrated to shared template

### Step 5 — Update `EmailTemplatePreview.tsx` in the admin panel

The preview component (`src/components/admin/EmailTemplatePreview.tsx`) generates its own mock HTML for the admin preview. It currently uses the old dark styles. It is updated to:
- Show the actual GIF as the header `<img>` (using the public URL)
- Use white body background (`#ffffff`)
- Use dark text colors

This ensures what the admin sees in the preview matches what recipients actually receive.

---

## File Change Summary

| File | Change | Impact |
|---|---|---|
| `public/email-header.gif` | Copy GIF from user-uploads | Hosts the GIF at public URL |
| `supabase/functions/_shared/email-config.ts` | Add `EMAIL_HEADER_GIF` constant | Single update point for future redesigns |
| `supabase/functions/_shared/email-templates/base-template.ts` | Replace header with GIF + flip to white body | All ~20 shared-system emails instantly updated |
| `supabase/functions/_shared/email-templates/components.ts` | Update Card/Divider colors for white background | Cards visible on white background |
| `supabase/functions/send-approval-notification/index.ts` | Migrate raw HTML → `base-template.ts` | Most important email gets GIF header |
| `supabase/functions/send-partner-welcome/index.ts` | Migrate raw HTML → `base-template.ts` | Partner welcome gets GIF header |
| `supabase/functions/notify-admin-partner-request/index.ts` | Migrate raw HTML → `base-template.ts` | Admin alert gets GIF header |
| `supabase/functions/provision-partner/index.ts` | Migrate raw HTML → `base-template.ts` | Provisioning email gets GIF header |
| `supabase/functions/send-booking-reminder/index.ts` | Migrate raw HTML → `base-template.ts` | Booking reminder gets GIF header |
| `src/components/admin/EmailTemplatePreview.tsx` | Show actual GIF + white body in admin preview | Preview matches real output |

**Total: 10 file changes. Result: 100% of outbound emails from The Quantum Club render your Canva GIF header and white body.**

---

## What Recipients See After This

```
┌────────────────────────────────────────┐
│ [YOUR CANVA GIF — full width, 600px]  │
│ [animated black/beige → fades white]  │
├────────────────────────────────────────┤  ← seamless white continuation
│                                        │
│  Dear Jane,                            │
│                                        │
│  Congratulations! You have been...     │
│                                        │
│  ┌──────────────────────────────┐      │
│  │ What's Next:                 │      │
│  │ • Darryl contacts you...     │      │
│  │ • Schedule your call         │      │
│  └──────────────────────────────┘      │
│                                        │
│       [ Access Your Dashboard ]        │
│                                        │
│  Best regards,                         │
│  The Quantum Club Team                 │
│                                        │
├────────────────────────────────────────┤
│  Email Preferences • Support • Privacy │
│  © 2026 The Quantum Club               │
└────────────────────────────────────────┘
```

The GIF header fades directly into the white card body with no visible seam — exactly as designed in Canva.
