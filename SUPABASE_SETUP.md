# Supabase Setup & Deployment Guide

## Configuration
- **Project ID**: `dpjucecmoyfzrduhlctt`
- **Supabase URL**: `https://dpjucecmoyfzrduhlctt.supabase.co`

## Quick Repair
I have repaired the configuration by:
1. Adding a `deno.json` to the empty `supabase/functions/` directory to mapping shared imports.
2. Removing references to missing functions (`api-v1-jobs`, `api-v1-applications`, `api-v1-candidates`) from `config.toml`.
3. Verifying that the Project ID matches your `.env` file.

## Deployment Instructions
Since Lovable cannot access your local CLI login state, you must run the following commands manually in your terminal to apply the repairs:

### 1. Authenticate
```bash
npx supabase login
```

### 2. Deployment
Deploy all functions (this fixes the "logs missing" issue by updating the deployed metadata):
```bash
npx supabase functions deploy --force
```

### 3. Database Migrations
Ensure your database is in sync:
```bash
npx supabase db push
```

## Troubleshooting
If you still see "Failed to get logs":
- Run `npx supabase functions list` to verify all functions are "ACTIVE".
- Ensure your `SUPABASE_ACCESS_TOKEN` is valid if running in a CI environment.
