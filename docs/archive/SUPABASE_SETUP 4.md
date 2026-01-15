# Supabase Setup & Deployment Guide

## Configuration
- **Project ID**: `dpjucecmoyfzrduhlctt`
- **Supabase URL**: `https://dpjucecmoyfzrduhlctt.supabase.co`

## Environment Variables
Ensure your `.env` file contains the following (do not commit secrets to git):
```bash
VITE_SUPABASE_PROJECT_ID="dpjucecmoyfzrduhlctt"
VITE_SUPABASE_URL="https://dpjucecmoyfzrduhlctt.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<your-anon-key>"
```

## CLI Setup
To manage functions and migrations, you must authenticate the Supabase CLI:
```bash
npx supabase login
npx supabase link --project-ref dpjucecmoyfzrduhlctt
```

## Deployment
To deploy all Edge Functions:
```bash
npx supabase functions deploy
```
To force a redeploy (useful if sync issues occur):
```bash
npx supabase functions deploy --force
```

To apply database migrations:
```bash
npx supabase db push
```

## Troubleshooting
If Lovable cannot access logs:
1. Ensure the `project_id` in `supabase/config.toml` matches the remote project.
2. Redeploy functions to ensuring they are linked to the correct project.
3. Check `supabase functions list` to see deployment status.
