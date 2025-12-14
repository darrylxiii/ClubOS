# App Store Screenshot Specifications

## iOS Screenshots

### Required Device Sizes

| Device | Resolution | Required |
|--------|------------|----------|
| iPhone 6.7" (15 Pro Max, 14 Pro Max) | 1290 × 2796 | Yes |
| iPhone 6.5" (14 Plus, 13 Pro Max, 12 Pro Max) | 1284 × 2778 | Yes |
| iPhone 5.5" (8 Plus, 7 Plus, 6s Plus) | 1242 × 2208 | Yes |
| iPad Pro 12.9" (6th gen) | 2048 × 2732 | Optional |
| iPad Pro 11" | 1668 × 2388 | Optional |

### Screenshot Count
- Minimum: 1 screenshot per device size
- Maximum: 10 screenshots per device size
- Recommended: 5-8 screenshots

---

## Android Screenshots

### Required Device Sizes

| Type | Resolution | Aspect Ratio |
|------|------------|--------------|
| Phone | 1080 × 1920 | 9:16 |
| 7" Tablet | 1200 × 1920 | 10:16 |
| 10" Tablet | 1600 × 2560 | 10:16 |

### Screenshot Count
- Minimum: 2 screenshots
- Maximum: 8 screenshots
- Recommended: 4-6 screenshots

---

## Screenshot Content Guidelines

### Screen 1: Home Dashboard
**Focus:** First impression, value proposition
**Content:**
- Clean dashboard view
- Key metrics visible
- Navigation elements
**Caption:** "Your Career Command Center"

### Screen 2: Job Discovery
**Focus:** Job search functionality
**Content:**
- Job cards with company logos
- Filter options visible
- Match percentages
**Caption:** "Discover Exclusive Opportunities"

### Screen 3: Application Pipeline
**Focus:** Application tracking
**Content:**
- Kanban-style pipeline view
- Multiple application stages
- Progress indicators
**Caption:** "Track Every Application in Real-Time"

### Screen 4: Club Meetings
**Focus:** Video interview feature
**Content:**
- Active video call interface
- Premium UI with controls
- Professional appearance
**Caption:** "Seamless Video Interviews"

### Screen 5: Messages
**Focus:** Communication features
**Content:**
- Conversation list
- Message preview
- Unread indicators
**Caption:** "Direct Communication with Recruiters"

### Screen 6: Club AI (QUIN)
**Focus:** AI assistance
**Content:**
- AI chat interface
- Career advice being given
- Actionable suggestions
**Caption:** "AI-Powered Career Guidance"

### Screen 7: Assessments
**Focus:** Skills validation
**Content:**
- Assessment cards
- Progress indicators
- Skill badges
**Caption:** "Showcase Your Skills"

### Screen 8: Profile
**Focus:** Professional brand
**Content:**
- Profile completion
- Achievement badges
- Portfolio preview
**Caption:** "Build Your Professional Brand"

---

## Design Guidelines

### Brand Colors
- Primary: Gold (#C9A24E)
- Background: Eclipse (#0E0E10)
- Text: Ivory (#F5F4EF)
- Accent: Appropriate per-screen

### Typography
- Headlines: Bold, large
- Body: Clean, readable
- Use app's actual fonts

### Device Frames
- Optional for iOS (App Store Preview handles this)
- Recommended for Android for visual appeal

### Status Bar
- Show realistic status bar (time, battery, signal)
- 9:41 AM is standard for iOS
- Full battery preferred

### Safe Zones
- Keep key content away from notch/dynamic island area
- Avoid content in home indicator zone
- Leave margin from edges (20px minimum)

---

## Screenshot Creation Workflow

### 1. Preparation
```bash
# Set device to demo mode
# iOS: Settings > Developer > Set Status Bar
# Android: Demo mode in Developer Options
```

### 2. Capture
- Use simulator for consistent captures
- Xcode: Device > Take Screenshot (Cmd+S)
- Android Studio: Screenshot button in toolbar

### 3. Processing
- Resize to exact specifications
- Add device frames (optional)
- Add captions/overlays

### 4. Export
- Format: PNG or JPEG
- Color space: sRGB
- No alpha channel for JPEG

---

## Preview Videos (Optional)

### App Preview Specifications

| Platform | Resolution | Duration | Format |
|----------|------------|----------|--------|
| iOS | Same as screenshots | 15-30 sec | MOV, M4V |
| Android | 1080p (1920×1080) | 30 sec - 2 min | WebM, MP4 |

### Video Content Suggestions
1. App launch and onboarding
2. Job search and discovery
3. Application submission
4. Video interview demo
5. AI chat interaction

---

## Localization

### Localized Screenshots Required For:
- English (US) - Primary
- Dutch (NL)
- Spanish (ES)
- German (DE)
- French (FR)

### Localization Guidelines
- Translate all visible UI text
- Adapt captions to target language
- Use culturally appropriate content
- Maintain brand consistency

---

## File Naming Convention

```
{platform}_{device}_{screen_number}_{language}.png

Examples:
ios_6.7_01_home_en.png
ios_6.5_02_jobs_nl.png
android_phone_01_home_en.png
android_tablet_03_pipeline_es.png
```

---

## Checklist Before Submission

- [ ] All required device sizes covered
- [ ] Screenshots in correct resolution
- [ ] No placeholder content visible
- [ ] Real data (or realistic mock data)
- [ ] Consistent branding across all screens
- [ ] Captions are accurate and engaging
- [ ] Localized versions completed
- [ ] Preview video meets specifications
- [ ] File sizes within limits
