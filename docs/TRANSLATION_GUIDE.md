# Translation System Guide

## Overview

The Quantum Club uses a comprehensive i18n (internationalization) system powered by Supabase for storing translations. All translations are centrally managed in the database and automatically loaded on language change.

**Supported Languages:**
- 🇬🇧 English (en) - Source language
- 🇳🇱 Dutch (nl)
- 🇩🇪 German (de)
- 🇫🇷 French (fr)
- 🇪🇸 Spanish (es)
- 🇨🇳 Chinese (zh)
- 🇸🇦 Arabic (ar) - RTL support
- 🇷🇺 Russian (ru)

---

## Quick Start

### Adding New Translatable Text

**Step 1: Add English Key to Database**

Navigate to `/admin/translations` and add the new key to the English (`en`) translations:

```json
{
  "home": {
    "newFeature": {
      "title": "New Feature Title",
      "description": "Feature description"
    }
  }
}
```

**Step 2: Generate Translations**

Click **"Generate ALL"** button in Translation Manager to auto-translate across all 8 languages.

**Step 3: Use in Component**

```typescript
// For JSX text (preferred)
import { T } from '@/components/T';

<T k="common:home.newFeature.title" fallback="New Feature Title" />

// For JavaScript strings
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();
const title = t('common:home.newFeature.title');
```

---

## Translation Key Structure

### Namespace Format

Keys follow the pattern: `namespace:path.to.key`

**Available Namespaces:**
- `common` - General UI elements, actions, status messages
- `auth` - Authentication flows
- `onboarding` - User onboarding screens

### Naming Conventions

```
common:
  ├── branding         # Brand name, tagline
  ├── home             # Homepage content
  │   ├── quickTips
  │   ├── stats
  │   └── welcome
  ├── navigation       # Menu items
  ├── actions          # Button labels
  ├── status           # Loading, success, error states
  ├── notifications    # Notification messages
  ├── jobs             # Job-related text
  ├── applications     # Application statuses
  ├── messages         # Messaging UI
  ├── profile          # Profile settings
  ├── forms            # Form labels, placeholders
  ├── modals           # Dialog messages
  └── empty            # Empty state messages
```

---

## Usage Examples

### 1. Simple Text Translation

```tsx
// Component text
<T k="common:actions.save" fallback="Save" />

// With variables
<T 
  k="common:time.daysAgo" 
  values={{ count: 5 }} 
  fallback="5 days ago" 
/>

// Custom HTML tag
<T 
  k="common:home.quickTips.title" 
  as="h2" 
  className="text-2xl font-bold" 
  fallback="Quick Tips" 
/>
```

### 2. JavaScript String Translation

```tsx
const { t } = useTranslation();

// Simple translation
const label = t('common:actions.cancel');

// With variables
const message = t('common:notifications.newMessage', { name: 'John' });

// With default value
const fallback = t('common:empty.noData', 'No data available');
```

### 3. Dynamic Translations

```tsx
const statusConfig = {
  applied: {
    labelKey: "common:applications.status.applied",
    className: "bg-secondary"
  },
  interview: {
    labelKey: "common:applications.status.interview",
    className: "bg-accent"
  }
};

<span className={statusConfig[status].className}>
  {t(statusConfig[status].labelKey)}
</span>
```

---

## Real-Time Language Switching

### How It Works

1. User clicks language switcher
2. `i18n.changeLanguage(code)` is called
3. App.tsx detects change and invalidates React Query cache
4. All components re-render with new language
5. `document.documentElement.lang` and `dir` attributes update for accessibility

### RTL Support (Arabic)

Arabic language automatically triggers RTL (right-to-left) layout:

```typescript
// Automatically applied on language change
document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
```

---

## Admin Translation Manager

Access: `/admin/translations`

**Features:**
- View translation coverage across all languages
- Add/edit English source translations
- Generate all translations with one click
- Monitor translation status per namespace

**Translation Generation:**
- Uses AI to translate English → all 7 languages
- Cost: ~$0.05 per 100 keys
- Time: 4-5 minutes (rate-limited for stability)
- Result: 1:1 key parity across all languages

---

## Development Tools

### Translation Debugger

Enable in dev mode to see:
- Missing translation keys
- Current language
- Fallback usage
- Key-to-value mapping

### VS Code Snippets

Installed at `.vscode/translation.code-snippets`

**Shortcuts:**
- `t-comp` → `<T k="common:..." fallback="..." />`
- `t-hook` → `const { t } = useTranslation();`

---

## Best Practices

### ✅ DO

- Always provide `fallback` prop for `<T>` component
- Use semantic key names (e.g., `actions.save` not `saveBtn`)
- Group related keys under common paths
- Test translations in all 8 languages before production
- Verify RTL layout with Arabic language

### ❌ DON'T

- Don't hardcode strings in components (use translation keys)
- Don't skip fallback values (they ensure text shows even if translation fails)
- Don't create duplicate keys (reuse existing keys when possible)
- Don't nest keys more than 3 levels deep
- Don't translate technical terms (API, URL, etc.)

---

## Troubleshooting

### Issue: Translation Not Showing

**Check:**
1. Is the key in the database? → Visit `/admin/translations`
2. Did you generate translations? → Click "Generate ALL"
3. Is the namespace loaded? → Check `src/i18n/config.ts` `ns` array
4. Is the fallback correct? → Verify `fallback` prop exists

### Issue: Language Switch Not Working

**Check:**
1. Browser console for errors
2. Network tab for failed translation fetches
3. localStorage `i18nextLng` value
4. React Query cache invalidation is firing

### Issue: Missing Translations for Spanish/Chinese/Arabic/Russian

**Solution:**
1. Go to `/admin/translations`
2. Click **"Generate ALL"** button
3. Wait 4-5 minutes for completion
4. Refresh page and verify all languages now have translations

---

## Performance Optimization

### Preloading

All namespaces are preloaded on app boot to prevent flickering:

```typescript
// src/i18n/config.ts
preload: ['en', 'nl', 'de', 'fr', 'es', 'zh', 'ar', 'ru']
```

### Caching

- Translations cached in React Query (5 min stale time)
- localStorage caches selected language
- Supabase backend caches active translations

---

## Production Checklist

Before launching:

- [ ] All English keys added to database
- [ ] "Generate ALL" run successfully (all 8 languages)
- [ ] Translation coverage ≥95% (check `/admin/translations`)
- [ ] Test language switcher on 5+ pages
- [ ] Verify Arabic RTL layout (no UI breaks)
- [ ] Check for hardcoded strings (search for `"[A-Z]` in components)
- [ ] Confirm fallbacks display correctly if translation fails
- [ ] Test on mobile (language switcher accessible)

---

## Support

For issues or questions:
- Check Supabase edge function logs: `/admin/translations`
- Review `docs/TRANSLATION_SYSTEM.md` for architecture
- Contact: dev@thequantumclub.com

---

*Last updated: Phase 8 Complete - 100% Translation Coverage*
