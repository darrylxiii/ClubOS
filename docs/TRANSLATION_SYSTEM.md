# Translation System Architecture

## Source of Truth
All translations are stored in the Supabase `translations` table.
**Local JSON files in `public/locales/*` are NOT used.**

## How It Works

### Backend Architecture
1. **i18n Config** (`src/i18n/config.ts`) uses `SupabaseBackend` to fetch translations
2. **English translations** in the database are the source of truth
3. **Other languages** are AI-generated from English using Lovable AI
4. Translations are cached in the browser for performance

### Frontend Integration
- **Components** use `<T k="namespace:key" fallback="Default" />` for UI text
- **Hooks** use `const { t } = useTranslation(); t('namespace:key')`
- **Real-time sync** via `useTranslationSync()` ensures all components update on language change

## Translation Namespaces

| Namespace | Purpose | Key Count (EN) |
|-----------|---------|----------------|
| `common` | Shared UI elements, navigation, actions | 50+ |
| `auth` | Authentication flows (login, signup, verify) | 30+ |
| `onboarding` | New user onboarding experience | 20+ |

## Adding New Translation Keys

### Step 1: Add to English Source
1. Open **Admin → Translation Manager**
2. Use **"Seed English Translations"** if the namespace doesn't exist yet
3. Or manually update the `translations` table for the `common` namespace:
   ```sql
   UPDATE translations 
   SET translations = translations || '{"new_section": {"key": "Value"}}'::jsonb
   WHERE namespace = 'common' AND language = 'en' AND is_active = true
   ```

### Step 2: Generate Translations
1. Click **"Generate ALL"** to translate all namespaces to all 7 languages
2. Or click **"Translate Missing Only"** for a specific namespace (cost-effective)

### Step 3: Use in Components
```tsx
// Option 1: Component syntax
<T k="common:new_section.key" fallback="Value" />

// Option 2: Hook syntax
const { t } = useTranslation();
<span>{t('common:new_section.key', 'Value')}</span>
```

## Updating Translation Keys

### For Small Changes (Recommended)
1. Update English source in the database
2. Use **"Translate Missing Only"** to update only changed keys
3. **Cost:** ~$0.03 per namespace × 7 languages = ~$0.21

### For Large Changes
1. Update English source
2. Click **"Generate ALL"** to regenerate everything
3. **Cost:** ~$0.60 for all namespaces

## Supported Languages

| Code | Language | Status |
|------|----------|--------|
| `en` | English | Source (manual) |
| `nl` | Dutch | AI-generated |
| `de` | German | AI-generated |
| `fr` | French | AI-generated |
| `es` | Spanish | AI-generated |
| `zh` | Chinese | AI-generated |
| `ar` | Arabic | AI-generated (RTL) |
| `ru` | Russian | AI-generated |

## Developer Tools

### Translation Coverage Dashboard
- **Location:** Admin → Translation Manager → Coverage Dashboard
- **Metrics:** Overall completion, per-language coverage, missing keys
- **Purpose:** Identify untranslated content before production

### Translation Debugger (Dev Only)
- **Activation:** Visible only in development mode
- **Features:** 
  - Shows current language and coverage stats
  - Highlights missing translations with red background
  - Toggle visual mode to see all untranslated strings
- **Location:** Bottom-right corner of screen

### VS Code Snippets
- **File:** `.vscode/translation.code-snippets`
- **Shortcuts:**
  - `t-comp` → `<T k="common:" fallback="" />`
  - `t-hook` → `const { t } = useTranslation();`
  - `t-sync` → `const { currentLanguage } = useTranslationSync();`

## Troubleshooting

### Translations Not Appearing
1. Check browser console for `[SupabaseBackend]` logs
2. Verify the key exists in the database:
   ```sql
   SELECT translations FROM translations 
   WHERE namespace = 'common' AND language = 'en' AND is_active = true
   ```
3. Ensure the key path is correct (e.g., `common:preferences.display.title`)

### Language Switch Not Working
1. Check that `<LanguageSwitcher />` is using `useTranslationSync()`
2. Verify the custom event `languageChange` is being dispatched
3. Check that components are listening for language changes

### Generation Stuck on Loading
1. Check the edge function logs for rate limit errors
2. Wait 5 minutes and try again (Lovable AI rate limits)
3. Use **"Translate Missing Only"** for smaller batches

## Cost Optimization

| Strategy | Cost | Use When |
|----------|------|----------|
| Translate Missing Only | $0.03/namespace | Adding 1-5 keys |
| Generate Single Namespace | $0.20 | Major namespace changes |
| Generate ALL | $0.60 | Initial setup or full refresh |

## Architecture Decisions

### Why Supabase Backend?
- **Centralized:** Single source of truth for all languages
- **Scalable:** Add new languages without app redeployment
- **A/B Testing:** Update translations in real-time for experiments
- **Rollback:** Version control via `version` column

### Why NOT Local JSON Files?
- **Outdated:** Risk of stale translations in codebase
- **Duplication:** Same content in multiple places
- **Deployment:** Requires app rebuild for every translation change
- **Collaboration:** Hard for non-developers to update translations

## Best Practices

1. **Always use fallbacks:** `<T k="key" fallback="Default" />`
2. **Namespace wisely:** Keep related keys together
3. **Avoid hardcoded strings:** Use translation keys everywhere
4. **Test language switching:** Verify all components update correctly
5. **Monitor coverage:** Keep dashboard above 95% completion
6. **Document new sections:** Add to this file when creating new namespaces

## Production Checklist

- [ ] All namespaces have 100% coverage for primary languages (en, nl, de)
- [ ] Translation debugger is disabled in production build
- [ ] Language switcher works on all pages
- [ ] RTL languages (Arabic) render correctly
- [ ] Settings dropdown syncs with language selector
- [ ] No console errors from `[SupabaseBackend]`
- [ ] Coverage dashboard shows green for all critical paths

## Support

For issues or questions:
1. Check the [Translation Coverage Dashboard](#translation-coverage-dashboard)
2. Review browser console logs
3. Verify database state in Supabase
4. Contact the development team

---

**Last Updated:** 2025-01-16  
**System Version:** 1.0 (Enterprise-grade)  
**Maintainer:** The Quantum Club Engineering Team
