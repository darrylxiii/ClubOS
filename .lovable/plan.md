
<context>
You are on `/admin/exports`. `schema.sql` downloads, but the data export fails with:

{"error":"canceling statement due to statement timeout","code":"INTERNAL_ERROR",...}

We already moved away from a single monolithic `tqc_generate_data_dump()` by implementing a chunked “manifest + SQL parts” approach in the backend function `data-dump`. That was the right direction, but we’re still hitting a database statement timeout inside one of the per-page table reads.
</context>

<what-this-error-means>
“canceling statement due to statement timeout” is coming from the database canceling a single SELECT query that runs too long. In our current `data-dump` implementation, that can still happen because:

1) We paginate using OFFSET/range (`.range(offset, offset + pageSize - 1)`).
   - OFFSET pagination gets slower and slower as offset grows (the database still has to walk/skip the earlier rows).
   - On tables with 500k+ rows, offsets like 200k/400k can cross the timeout threshold even with pageSize=1000.

2) If the chosen order column is not indexed (or we fall back to `columns[0]`), `ORDER BY <non-indexed>` forces a big sort.
   - Big sort + OFFSET is the worst-case combination.

So, even though the export is chunked and resumable, the *query strategy* is still capable of timing out on large tables.
</what-this-error-means>

<goal>
Make `/admin/exports` “Generate data export (manifest)” complete reliably for very large datasets by ensuring each page query is fast and index-friendly.
</goal>

<solution-overview>
We’ll replace offset-based pagination with index-friendly keyset pagination wherever possible, and we’ll stop guessing ordering from “first column”. Concretely:

- Determine each table’s best stable ordering key (prefer Primary Key, then a single-column unique index, then `id` if present).
- Paginate with “last seen key” (keyset pagination) instead of OFFSET.
- Keep OFFSET pagination only as a last-resort fallback, and treat those tables as “may be slow”; optionally export them with smaller page sizes or skip with a warning if they repeatedly time out.

This is the holistic fix: it addresses the real cause (slow queries) instead of adding more retries/timeouts.
</solution-overview>

<step-by-step implementation plan>
<step id="1" title="Inspect current data-dump behavior and identify which table/page is timing out">
1. Add lightweight server-side instrumentation in `supabase/functions/data-dump/index.ts`:
   - log: exportId, schema.table, chosen order key, pagination mode (keyset vs offset), pageSize, page number, elapsed ms.
2. When you click “Generate data export (manifest)” again, we’ll read backend logs to see the exact table/page where the timeout occurs.
   - This avoids guessing and lets us confirm the problematic table(s) and whether it’s offset growth or non-indexed order.

Acceptance: we can point to a specific `schema.table` + page at failure.
</step>

<step id="2" title="Add backend SQL helper(s) to discover primary key / stable ordering columns">
Because the backend function can’t efficiently infer PK/indexes via PostgREST, we’ll add database helper functions (via migration) that safely read from pg_catalog and return metadata. For example:

- `public.tqc__table_ordering_key(p_schema text, p_table text)`
  - returns: `{ key_columns text[], strategy text }`
  - strategy example: `primary_key`, `unique_index`, `id_column`, `none`

- `public.tqc__table_columns(p_schema text, p_table text)`
  - returns: ordered list of columns so we don’t rely on “sample row keys” (which fails for empty tables and can reorder unpredictably).

Security posture:
- These functions are read-only.
- Mark them `SECURITY DEFINER` and only expose them to admin/service-role paths we already use for exports.
- Keep schema allowlisting (only application schemas) consistent with your earlier fixes.

Acceptance: from the backend function we can reliably fetch the ordering key and columns for each table.
</step>

<step id="3" title="Upgrade data-dump pagination to keyset (fast for 500k+ rows)">
Modify `supabase/functions/data-dump/index.ts`:

A) Change ResumeCursor to support keyset:
- Current: `{ tableIndex, offset }`
- New: `{ tableIndex, mode: 'keyset'|'offset', lastKey?: string|number|null, offset?: number }`
  - For now we’ll support single-column keysets (most tables). Composite PKs can fall back to offset with warnings.

B) For tables with a single stable key (PK/unique/id):
- Query:
  - first page: `.order(key).limit(pageSize)`
  - next pages: `.gt(key, lastKey).order(key).limit(pageSize)`
- Track `lastKey` from the last row of each page.

C) For tables without a usable key:
- Fallback to offset pagination but:
  - use smaller page sizes (e.g. 200)
  - add explicit warning in manifest (“non-keyset table; may be slower”)
  - add retry-on-timeout (see next step)

Why this works:
- Keyset queries stay O(pageSize) instead of getting slower with big offsets.
- The database can use an index on the key (PK/unique) and avoid huge sorts.

Acceptance: export proceeds through very large tables without query slowdown over time.
</step>

<step id="4" title="Add automatic timeout-aware retries and a “skip table” safety valve">
Even with keyset, a few tables can be pathological (wide rows, heavy RLS/view complexity, missing indexes).

We’ll add:
1. Retry logic for a page read that fails with statement timeout:
   - retry up to 2 times
   - reduce pageSize on retry (e.g., 1000 → 300 → 100)
2. If it still times out:
   - record a warning: “Skipped table schema.table due to repeated timeouts”
   - continue to next table
   - keep export “done: true” but with warnings

This is “fail open for export completeness, fail closed for correctness”: you’ll always get an export artifact + a precise list of what was skipped, rather than a hard stop.

Acceptance: export completes even if 1–2 tables are problematic, and you have a clear actionable warning list.
</step>

<step id="5" title="Make the UI show progress and surface warnings as first-class output">
Update `src/pages/admin/AdminExports.tsx` UX:

- While looping calls:
  - show progress text: “Generating… table X/Y”
  - show “Current exportId”
- On completion:
  - show a summary line: “N files, W warnings, expires in ~Xm”
  - keep the “Download all SQL parts” button
- On failure:
  - show a more actionable error if the response is JSON (extract `.error` fields) rather than dumping raw text.

Acceptance: the UI communicates what’s happening during multi-call exports, reduces perceived “hangs”, and makes warnings obvious.
</step>

<step id="6" title="Verification checklist (practical, no guesswork)">
1. Start export on `/admin/exports`.
2. Confirm we see backend logs identifying:
   - ordering key choice per table
   - keyset vs offset mode
   - per-page timings
3. Confirm export completes without statement timeouts on large tables.
4. Spot-check:
   - A known large table generates many parts without slowing down over time.
   - Manifest includes warnings only when appropriate (no key, skipped, etc.).
</step>
</step-by-step implementation plan>

<risk-management>
- Keyset pagination requires a stable, monotonic ordering column. PK/unique keys qualify.
- UUID ordering is lexicographic; it is stable and index-friendly. It may not reflect creation order, but export correctness does not require chronological order—only deterministic coverage.
- Composite PK tables will be treated carefully (fallback mode + warnings). If you want perfect handling, we can extend keyset to composite keys later.
</risk-management>

<explicit-de-scope (keeps this reliable and shippable)>
- We will not attempt perfect type fidelity for every PostgreSQL-specific type in SQL literals in this iteration (we keep your current safe JSON-string fallback).
- We will not implement composite-key keyset pagination in v1 unless we find it’s required by your schema.
- We will not change database statement_timeout settings globally; we’ll make queries fast enough to stay under limits.
</explicit-de-scope>

<acceptance-criteria>
- “Generate data export (manifest)” completes reliably on a large (500k+ row) dataset.
- No fatal “canceling statement due to statement timeout” interrupts the export.
- If any tables cannot be exported, the manifest includes explicit warnings naming them and why.
</acceptance-criteria>
