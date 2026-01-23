
<context>
You now have `schema.sql` downloading successfully.

`data.sql` still fails with:
- `{"error":"canceling statement due to statement timeout" ...}`

You also confirmed:
- Export format preference: **Manifest + SQL parts (recommended)**
- Export scope: **Full database (app tables)**
- Expected size: **Large (500k+ rows)**

This is the correct direction: a single monolithic `data.sql` generated inside the database will eventually hit timeouts and/or memory limits as the dataset grows. We should switch to a paged, resumable export that uploads parts to private storage and returns signed URLs (manifest).
</context>

<root-cause step-by-step="true">
1) The `/admin/exports` “Download data.sql” button currently calls the backend `data-dump` function.
2) `data-dump` calls the database RPC `tqc_generate_data_dump()`.
3) `tqc_generate_data_dump()` loops every table and runs (per table) something equivalent to:
   - `SELECT string_agg(...) FROM <table>`
4) For large tables this becomes a long-running statement that:
   - scans a lot of rows,
   - builds a huge text blob in memory,
   - and frequently exceeds the database’s `statement_timeout`.
5) Even if we raise timeouts, this approach remains fragile:
   - response body becomes extremely large,
   - browser `res.text()` loads everything into memory (risking a crash),
   - and any transient hiccup ruins the entire export.

Therefore the fix is architectural: stop generating “all data” as one DB statement; instead export in chunks and store artifacts as files.
</root-cause>

<solution-overview>
We will keep `schema.sql` as-is (it’s working and is relatively bounded), and replace the data export pipeline with a robust “manifest + SQL parts” system:

- Backend function `data-dump` will:
  - enumerate tables,
  - export rows in pages (e.g., 1,000 rows per page),
  - write multiple `.sql` part files to a private storage bucket,
  - and return a JSON manifest containing signed URLs + execution order.
- Frontend `/admin/exports` will:
  - call the backend function,
  - download the manifest (and optionally auto-download all parts),
  - and show clear “run order” instructions.

This eliminates database statement timeout and client memory issues.
</solution-overview>

<implementation-plan>
<phase id="1" name="Backend storage for admin exports">
1. Create a dedicated private storage bucket: `admin-exports` (or reuse `data-room`, but `admin-exports` is cleaner).
2. Add storage policies mirroring the existing `data-room` approach:
   - Admins (and `super_admin` if that role exists) can INSERT/SELECT/DELETE objects in `admin-exports`.
3. (Optional but recommended) Add a small retention policy mechanism later (e.g., auto-purge exports older than 7 days). For now we’ll use short-lived signed URLs and store in a predictable folder path.

Deliverable: a migration that inserts the bucket + policies (no destructive changes).
</phase>

<phase id="2" name="Replace data export generation with chunking + manifest">
We will update `supabase/functions/data-dump/index.ts` (backend function) so it no longer calls `tqc_generate_data_dump()`.

New behavior:
1. Authenticate + `requireRole(['admin'])` (keep current security).
2. Determine export job settings:
   - `pageSize = 1000` rows
   - `maxTablesPerRun = 5` (or time-based watchdog)
   - signed URL expiry e.g. 1 hour (3600s)
3. Get the table list:
   - call the existing RPC `tqc__list_user_tables()` (already filters system schemas).
   - (Optional optimization) also fetch `pg_stat_user_tables` row estimates via a small new SQL helper so we can skip empty tables quickly or prioritize big tables last.
4. Export preamble (one small file):
   - `BEGIN;`
   - `ALTER TABLE ... DISABLE TRIGGER ALL;` for all user tables
   - `-- metadata` (timestamp, pageSize, etc.)
5. For each table (bounded by watchdog):
   - Export in pages:
     - fetch rows 0..999, 1000..1999, etc.
     - use deterministic ordering:
       - prefer `order('id')` if `id` exists
       - otherwise `order(<first_column>)`
       - fallback: no order but warn in manifest (still works, but less stable)
   - Convert each row into SQL INSERT statements:
     - Use proper literal escaping (quotes, newlines)
     - Preserve `NULL` vs strings
     - Prefer `INSERT INTO schema.table (col1, ...) VALUES (...);`
     - (If identity columns exist) keep `OVERRIDING SYSTEM VALUE` like you had before
   - Write each page to a separate file:
     - `admin-exports/sql/<timestamp>/<schema>.<table>/part-0001.sql`
     - This keeps each artifact small and avoids memory spikes.
6. Export epilogue (one small file):
   - `ALTER TABLE ... ENABLE TRIGGER ALL;`
   - `COMMIT;`
7. Generate signed URLs for all produced files and return a manifest JSON:
   - `manifest.json` includes:
     - export id
     - created_at
     - list of files in the exact order to run:
       1) `schema.sql` (already downloaded separately)
       2) `data-preamble.sql`
       3) `table parts...`
       4) `data-epilogue.sql`
     - warnings (if any tables had no stable ordering)
     - counts (tables exported, parts generated)
8. Timeout safety:
   - Implement a 50–55s watchdog inside the backend function.
   - If we run out of time:
     - return a *partial* manifest + a `resumeCursor` telling the UI what table/page to continue from.
   - The UI can call the same backend function again with `resumeCursor` until complete, then it finalizes a single manifest.

This design is resilient under:
- large row counts,
- large number of tables,
- strict statement timeouts,
- browser memory constraints.
</phase>

<phase id="3" name="Update /admin/exports UI to handle manifest exports">
Update `src/pages/admin/AdminExports.tsx`:

1. Keep “Download schema.sql” as it is (plain text download).
2. Change “Download data.sql” to “Generate data export” and implement:
   - Call backend `data-dump` and parse JSON (not `res.text()`).
   - Show a small progress state:
     - “Generating… (batch 1/…)”
     - (If resumable) automatically call follow-up batches until complete.
   - When complete:
     - Automatically download `manifest.json`
     - Provide a “Download all parts” button that downloads each signed URL sequentially (with small delays to avoid browser popup blockers).
     - Display minimal instructions:
       - “Run schema.sql first”
       - “Then run files in manifest order”
       - “Signed URLs expire in X minutes”

This makes the button “work” even on very large datasets without freezing the browser.
</phase>

<phase id="4" name="Verification checklist (end-to-end)">
1. Open `/admin/exports`.
2. Click “Download schema.sql”:
   - must download, non-empty.
3. Click “Generate data export”:
   - should succeed without statement timeouts.
   - should download `manifest.json`.
   - should provide signed URLs (openable in browser).
4. Spot-check:
   - at least one large table produces multiple parts.
   - empty tables produce either no part or a small “-- (no rows)” file quickly.
5. Optional import test (best practice):
   - Run schema.sql into an empty database
   - Run data export parts in manifest order
   - Validate row counts for a few critical tables.

If anything still times out, the watchdog/batching knobs to tune are:
- `maxTablesPerRun` (lower it)
- `pageSize` (lower it)
- add “skip empty tables” optimization (using `pg_stat_user_tables`)
</phase>
</implementation-plan>

<notes>
- We will NOT try to “just increase timeouts” because that’s a brittle fix and will still break for larger dumps and/or crash the browser.
- This aligns with your enterprise posture: privacy-first, reliable, and audit-friendly.
- Security: exports remain private, access is via short-lived signed URLs, and generation is admin-gated server-side.
</notes>

<acceptance-criteria>
- `/admin/exports` data export no longer triggers:
  - “canceling statement due to statement timeout”
  - “cannot pass more than 100 arguments”
- Data export succeeds for large datasets by producing a manifest + multiple SQL part files.
- No secrets exposed client-side; only signed URLs returned.
</acceptance-criteria>
