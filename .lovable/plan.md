

# Email Branding Enhancement Plan

## Summary

This plan addresses three specific issues with the email system:
1. **Logo too small and squeezed** - Make it full-size and prominently displayed for clear branding
2. **Missing "Join Meeting" button** - Add the video call join button to all booking-related emails
3. **Small QC icon for meeting buttons** - Use the compact "QC" icon (like the collapsed sidebar) instead of the full logo in the join meeting section

---

## Current State Analysis

### Logo Issues
- **Current size**: 64x64 pixels - way too small for brand visibility
- **Target size**: 120x120 pixels (almost double) for prominent, oversized branding
- **File used**: `quantum-clover-icon.png` in `public/` folder

### Available Logo Assets
```text
public/
├── quantum-clover-icon.png  ← Full clover logo (header branding)
└── quantum-logo.svg         ← Vector version

src/assets/
├── quantum-logo-light-transparent.png  ← Small QC icon (white)
├── quantum-logo-dark-transparent.png   ← Small QC icon (black)
└── quantum-club-logo.png               ← Full text logo
```

### Missing Join Button
- The `send-booking-confirmation` already has `VideoCallCard` component
- The `send-booking-reminder-email` is MISSING the join meeting button
- Other emails may also be missing this functionality

---

## Implementation Plan

### Phase 1: Update Email Logo Configuration

**File**: `supabase/functions/_shared/email-config.ts`

Add new logo variants for different use cases:
- `fullBrand` - Large logo for email header (120px)
- `cloverIcon` - Standard clover icon (80px)
- `qcIcon` - Small QC text icon for meeting cards (40px)

```typescript
export const EMAIL_LOGOS = {
  // Primary header logo - OVERSIZED for clear branding
  fullBrand: `${EMAIL_ASSETS_BASE_URL}/quantum-clover-icon.png`,
  // Standard icon
  cloverIcon: `${EMAIL_ASSETS_BASE_URL}/quantum-clover-icon.png`,
  // Small QC icon for meeting join buttons (hosted version needed)
  qcIconLight: `${EMAIL_ASSETS_BASE_URL}/quantum-logo-light-transparent.png`,
  qcIconDark: `${EMAIL_ASSETS_BASE_URL}/quantum-logo-dark-transparent.png`,
  // Legacy aliases
  cloverIcon80: `${EMAIL_ASSETS_BASE_URL}/quantum-clover-icon.png`,
  cloverIcon40: `${EMAIL_ASSETS_BASE_URL}/quantum-clover-icon.png`,
  fullLogo: `${EMAIL_ASSETS_BASE_URL}/quantum-clover-icon.png`,
} as const;

// Logo sizes (in pixels)
export const EMAIL_LOGO_SIZES = {
  headerBrand: 120,   // Oversized for clear branding
  standard: 80,       // Standard usage
  meetingCard: 40,    // Small icon for meeting cards
} as const;
```

### Phase 2: Update Base Email Template Header

**File**: `supabase/functions/_shared/email-templates/base-template.ts`

Change logo from 64px squeezed to 120px full-size with proper aspect ratio:

```html
<!-- Logo Image - OVERSIZED for clear branding -->
<a href="${appUrl}" style="text-decoration: none;">
  <img 
    src="${EMAIL_LOGOS.fullBrand}" 
    alt="${COMPANY_NAME}" 
    title="${COMPANY_NAME}"
    width="120" 
    height="120" 
    style="display: block; margin: 0 auto 24px auto; border: 0; outline: none; max-width: 120px;"
    onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
  />
  <!-- Fallback: Larger styled Q circle -->
  <div style="display: none; width: 120px; height: 120px; margin: 0 auto 24px auto; background-color: ${EMAIL_COLORS.gold}; border-radius: 50%; line-height: 120px; text-align: center; font-size: 56px; font-weight: bold; color: #0E0E10;">Q</div>
</a>
```

### Phase 3: Add Join Meeting Button to Reminder Emails

**File**: `supabase/functions/send-booking-reminder-email/index.ts`

Add functionality to:
1. Fetch booking meeting link details
2. Include `VideoCallCard` component with join button
3. Use small QC icon in the meeting card

Changes needed:
- Import `VideoCallCard` component
- Fetch video platform and link from booking data
- Add join button to email content

```typescript
// Add to imports
import { VideoCallCard } from "../_shared/email-templates/components.ts";

// After fetching booking details, determine meeting link
const activePlatform = booking.active_video_platform;
let meetingLink = '';
let platformName = '';
let platformType = 'generic';

if (activePlatform === 'google_meet' && booking.google_meet_hangout_link) {
  meetingLink = booking.google_meet_hangout_link;
  platformName = 'Google Meet';
  platformType = 'google_meet';
} else if (activePlatform === 'quantum_club' && booking.quantum_meeting_link) {
  meetingLink = booking.quantum_meeting_link;
  platformName = 'Club Meetings';
  platformType = 'club_meetings';
}

// Add VideoCallCard to email content if meeting link exists
${meetingLink ? VideoCallCard({
  platform: platformType,
  platformName: platformName,
  joinUrl: meetingLink,
  instructions: 'Your meeting starts soon. Click below to join.',
}) : ''}
```

### Phase 4: Update VideoCallCard Component with Small QC Icon

**File**: `supabase/functions/_shared/email-templates/components.ts`

Modify `VideoCallCard` to use the small QC icon for Club Meetings platform:

```typescript
export const VideoCallCard = ({ 
  platform, 
  platformName,
  joinUrl, 
  meetingId,
  password,
  dialIn,
  instructions,
}: VideoCallCardProps): string => {
  // For club_meetings, use text-based "QC" badge instead of large logo
  const isClubMeetings = platform === 'club_meetings';
  const platformIcon = isClubMeetings 
    ? null  // Will use QC badge instead
    : PLATFORM_ICONS[platform as keyof typeof PLATFORM_ICONS];
  
  const iconHtml = isClubMeetings 
    ? `<div style="width: 40px; height: 40px; border-radius: 10px; background-color: ${EMAIL_COLORS.gold}; display: inline-block; text-align: center; line-height: 40px; font-weight: bold; font-size: 16px; color: ${EMAIL_COLORS.eclipse};">QC</div>`
    : `<img src="${platformIcon}" alt="${platformName}" width="40" height="40" style="display: block; border-radius: 8px;" />`;

  // ... rest of component
};
```

### Phase 5: Copy QC Icons to Public Folder

The small QC icons need to be accessible via URL for emails. Currently they're in `src/assets/` which is bundled with the app.

**Action**: Copy these files to `public/` folder:
- `quantum-logo-light-transparent.png` → `public/qc-icon-light.png`
- `quantum-logo-dark-transparent.png` → `public/qc-icon-dark.png`

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/_shared/email-config.ts` | Add new logo variants and size constants |
| `supabase/functions/_shared/email-templates/base-template.ts` | Increase header logo to 120px, improve spacing |
| `supabase/functions/_shared/email-templates/components.ts` | Update VideoCallCard to use QC badge for Club Meetings |
| `supabase/functions/send-booking-reminder-email/index.ts` | Add VideoCallCard join button |

## Visual Impact

```text
BEFORE                           AFTER
┌──────────────────┐            ┌──────────────────┐
│      [64px]      │            │                  │
│    small logo    │            │    [120px]       │
│                  │            │   LARGE LOGO     │
│ THE QUANTUM CLUB │            │                  │
└──────────────────┘            │ THE QUANTUM CLUB │
                                └──────────────────┘
                                
Meeting Card:                   Meeting Card:
┌──────────────────┐            ┌──────────────────┐
│ [large clover]   │            │ [QC] Club Meet   │
│ Join via Club... │            │ Join via Club... │
└──────────────────┘            └──────────────────┘
```

---

## Technical Notes

- Logo size increased from 64px to 120px (87% larger)
- Added 24px bottom margin for better spacing below logo
- Fallback "Q" circle also scales to 120px with 56px font
- VideoCallCard uses inline "QC" badge (gold background, eclipse text) instead of image for Club Meetings
- Other platforms (Google Meet, Zoom, Teams) continue using their brand icons

