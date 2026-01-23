
Goal: Make the two export buttons on `/admin/exports` reliably download `schema.sql` and `data.sql` without backend errors.

What’s happening (step-by-step diagnosis)

1) Error: `permission denied for schema cron`
- Your SQL dump generator is enumerating “user schemas” via `public.tqc__list_user_schemas()`.
- That helper currently excludes only a small set of reserved schemas (`pg_catalog`, `information_schema`, `auth`, `storage`, `realtime`, `supabase_functions`, `vault`).
- Your database also contains additional system/extension schemas: `cron`, `extensions`, `net`, `graphql`, `graphql_public`, etc. (we confirmed `cron` exists).
- Because `cron` is not excluded, the dump function tries to read/emit objects from it, and hits permission errors.

2) Error: `column reference "schema_name" is ambiguous`
- In the newer migration version of `tqc_generate_schema_dump()`, there are plpgsql variables named `schema_name` and `table_name`.
- Inside SQL statements within PL/pgSQL, unqualified identifiers like `schema_name` can conflict between:
  - the PL/pgSQL variable `schema_name`, and
  - a selected column named `schema_name` (e.g. from `tqc__list_user_schemas()` / `tqc__list_user_tables()`).
- This produces Postgres’s “ambiguous” error and aborts the function.

Key principle for the fix:
- Treat “which schemas/tables are included” as a strict allowlist.
- Avoid PL/pgSQL variable names that collide with common column names like `schema_name`, `table_name`, `id`, etc.

Proposed implementation (what I will change when you switch back to default mode)

A) Fix schema selection (eliminate the `cron` permission error)
1. Update `public.tqc__list_user_schemas()` to exclude additional system schemas:
   - Add: `cron`, `extensions`, `net`, `graphql`, `graphql_public`
   - Keep existing excludes: `pg_catalog`, `information_schema`, `auth`, `storage`, `realtime`, `supabase_functions`, `vault`
   - Keep excluding `pg_toast%` and `pg_temp%`
2. Optionally (recommended): exclude any schema starting with `supabase_` if present, to future-proof.
3. Ensure `tqc__list_user_tables()` relies only on the updated `tqc__list_user_schemas()`.

Result: dump functions never touch `cron` (or other extension schemas), so permissions don’t matter.

B) Fix the “schema_name is ambiguous” error (naming + qualification)
1. Update `public.tqc_generate_schema_dump()`:
   - Rename loop target variables to something that cannot collide, e.g.:
     - `v_schema_name text;`
     - `v_table_name text;`
   - Use `FOR v_schema_name, v_table_name IN SELECT ...` for looping over tables.
   - In every SQL statement that currently contains `SELECT schema_name FROM public.tqc__list_user_schemas()`, qualify the column via an alias:
     - `SELECT s.schema_name FROM public.tqc__list_user_schemas() s`
   - Same for any `tqc__list_user_tables()` usage if referenced in subqueries.

2. Update `public.tqc_generate_data_dump()` similarly (even if it’s not currently failing):
   - Rename loop target variables to `v_schema_name`, `v_table_name`.
   - Qualify references to helper-function columns with aliases where used in subqueries.

Result: Postgres can no longer confuse PL/pgSQL variables with result columns.

C) Deliver as a database migration (safe + auditable)
1. Create a new migration that:
   - `CREATE OR REPLACE FUNCTION public.tqc__list_user_schemas() ...`
   - `CREATE OR REPLACE FUNCTION public.tqc__list_user_tables() ...` (if needed, or keep as-is if it already defers to schemas helper)
   - `CREATE OR REPLACE FUNCTION public.tqc_generate_schema_dump() ...`
   - `CREATE OR REPLACE FUNCTION public.tqc_generate_data_dump() ...`
   - Re-apply the existing `REVOKE` statements at the end (keep them locked down).

D) Verification steps (how we’ll confirm it’s fixed)
1. From `/admin/exports`, click:
   - “Download schema.sql” → should download a non-empty file; no 500.
   - “Download data.sql” → should download a non-empty file; no 500.
2. Confirm schema.sql does NOT include `CREATE SCHEMA cron;` or any `cron.` objects.
3. If there’s still an error:
   - Inspect backend logs for the exact SQL statement failing and iterate once more (typically another schema to exclude, or another ambiguous identifier to qualify).

Edge cases & safety notes
- These dump functions read from system catalogs and information_schema; that’s fine, but only for schemas we explicitly include.
- Excluding extension/system schemas is correct because this export is intended for your app’s data, not managed infrastructure schemas.
- No changes are required in the UI buttons; they’re correctly calling the backend function and passing auth.

Scope control (explicit de-scope)
- We will not attempt to export extension definitions or scheduled jobs (cron) as part of these downloads.
- We will not change permissions broadly; we’ll just avoid touching schemas that raise permission errors.

Acceptance criteria
- Clicking “Download schema.sql” and “Download data.sql” from `/admin/exports` succeeds.
- No “permission denied for schema cron”.
- No “column reference schema_name is ambiguous”.
- Exports contain only application-relevant schemas/tables.

Next action once you approve this plan
- I will implement the migration changes described above, then re-test the buttons on `/admin/exports`.
