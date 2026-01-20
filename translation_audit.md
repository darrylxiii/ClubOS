# Translation Mechanism Audit Report

## 1. Executive Summary
The translation system utilizes **i18next** with a custom **SupabaseBackend**.  
**Current Status**: 🔴 **Not Working / Unstable**  
**Primary Cause**: The application is configured to load translations **exclusively from the database** (`src/i18n/supabase-backend.ts`), ignoring local JSON files. If the database table `translations` is empty or inaccessible (due to RLS), the application renders translation keys (e.g., `common:welcome`) or nothing.

## 2. Architecture Overview
*   **Library**: `i18next`, `react-i18next`.
*   **Backend**: `SupabaseBackend` (Custom implementation in `src/i18n/supabase-backend.ts`).
*   **Data Source**: Supabase table `translations`.
*   **Caching**: `localStorage` (Prefix: `tqc_translations_v2_`).
*   **Management**: Admin page at `/admin/translations` (`TranslationManager.tsx`).

## 3. Findings

### 3.1. Critical Configuration Issue
The initialization in `src/i18n/config.ts` uses `load: 'currentOnly'` and does not define `resources`.
The `SupabaseBackend` logic attempts to fetch from Supabase. If it fails or returns no data, it tries to fetch an English fallback **from Supabase**.
**Impact**: If the database is empty, there are **zero** translations available. Local files in `src/i18n/locales/` are currently **unused** by the runtime, serving only as a source for the Seeding script.

### 3.2. Database & RLS Uncertainty
*   The `translations` table definition exists in `src/integrations/supabase/types.ts`.
*   **Missing Migration**: We could not locate the specific migration file creating `translations` in `supabase/migrations`. This poses a risk that the local development database might be missing the table or, more critically, the **Row Level Security (RLS) policies**.
*   **Access Control**: If RLS is enabled but no policy exists for `SELECT` by `authenticated` or `anon` roles, the application will receive empty responses, even if data exists.

### 3.3. Seeding Dependency
The system relies on an initial "Seed" operation (`useSeedTranslations.ts`) which uploads local JSON files to the database.
*   If this has not been run, the app is broken.
*   The "Seed" button is located in the Admin Dashboard (`TranslationManager`), which might be inaccessible if the admin UI itself is untranslated and broken.

## 4. Recommendations & Next Steps

### Step 1: Fix Database Access (Immediate)
Create a new migration to ensuring the `translations` table exists and has the correct permissions. This ensures that signed-in users (and anonymous users, if public) can read translations.

### Step 2: Robust Fallback Configuration
Modify `src/i18n/config.ts` to include the local JSON files (`src/i18n/locales/en/*.json`) as a **synchronous fallback**. This ensures the app works immediately for English even if the database is empty or unreachable.

### Step 3: Seed the Database
Run the seeding process to populate the database with the initial English content.

### Step 4: Verify
After applying the migration and config change, reload the app. It should immediately show English content (from local files) and then hydrate from DB if available.
