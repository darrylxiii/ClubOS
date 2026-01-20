import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { publicCorsHeaders as corsHeaders } from '../_shared/cors-config.ts';

interface ExportRequest {
  tables?: string[];
  excludeTables?: string[];
}

interface ExportFile {
  table: string;
  part: number;
  rows: number;
  path: string;
  signedUrl: string;
}

interface ExportResult {
  table: string;
  rows: number;
  parts: number;
  error?: string;
}

// Increased page size for faster exports; each part still uploads after PAGES_PER_PART pages
const PAGE_SIZE = 5_000;        // Fetch 5k rows at a time (Supabase allows up to ~50k with range)
const PAGES_PER_PART = 1;       // Upload immediately after each page (5k rows per CSV part)
const MAX_TABLES_PER_CALL = 5;  // Process fewer tables per call
const MAX_RUNTIME_MS = 55_000;  // Increase to 55s (edge functions have 60s limit)

function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsvLines(data: Record<string, unknown>[], headers: string[]): string[] {
  const lines: string[] = [];
  for (const row of data) {
    lines.push(headers.map((h) => escapeCsvValue(row[h])).join(','));
  }
  return lines;
}

async function ensureBucketExists(supabaseAdmin: ReturnType<typeof createClient>, bucket: string) {
  // Storage API varies by environment; try create and ignore if it exists.
  try {
    // @ts-expect-error - createBucket exists in supabase-js, but types can differ in Deno esm shim
    await supabaseAdmin.storage.createBucket(bucket, { public: false });
  } catch (_e) {
    // ignore
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');

    // Create admin client with service role (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Standardized auth + role lookup
    const { authenticateUser, requireRole, createAuthErrorResponse } = await import(
      '../_shared/auth-helpers.ts'
    );

    let authContext: { userId: string; email: string; roles: string[] };

    try {
      authContext = await authenticateUser(authHeader);
      requireRole(authContext, ['admin']);
    } catch (authErr) {
      const message = authErr instanceof Error ? authErr.message : String(authErr);
      const status = message.toLowerCase().includes('missing authorization') ||
        message.toLowerCase().includes('invalid')
        ? 401
        : 403;

      return createAuthErrorResponse(message, status, corsHeaders);
    }

    const user = { id: authContext.userId, email: authContext.email };

    // Parse request body
    const body: ExportRequest = req.method === 'POST' ? await req.json() : {};
    const { tables: requestedTables, excludeTables = [] } = body;

    // If caller didn't specify tables, we can still export all, but enforce a hard cap per call.
    // The UI should batch calls to avoid timeouts.
    const { data: tableList, error: tableError } = await supabaseAdmin.rpc('get_public_tables');

    let tablesToExport: string[] = [];

    if (tableError || !tableList) {
      console.log('get_public_tables failed; falling back to a small safe list');
      tablesToExport = ['profiles', 'companies', 'jobs', 'applications', 'bookings'];
    } else {
      tablesToExport = (tableList as { table_name: string }[]).map((t) => t.table_name);
    }

    if (requestedTables && requestedTables.length > 0) {
      tablesToExport = tablesToExport.filter((t) => requestedTables.includes(t));
    }

    tablesToExport = tablesToExport.filter((t) => !excludeTables.includes(t));

    if (!requestedTables || requestedTables.length === 0) {
      tablesToExport = tablesToExport.slice(0, MAX_TABLES_PER_CALL);
    }

    if (tablesToExport.length > MAX_TABLES_PER_CALL) {
      return new Response(
        JSON.stringify({
          error: `Too many tables requested in one call (${tablesToExport.length}). Please export in batches of ${MAX_TABLES_PER_CALL}.`,
          code: 'TOO_MANY_TABLES',
          maxTablesPerCall: MAX_TABLES_PER_CALL,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log(`Exporting ${tablesToExport.length} tables (streaming, 1k rows per part)`);

    const startTime = Date.now();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const basePrefix = `exports/${timestamp}`;
    const bucket = 'admin-exports';

    await ensureBucketExists(supabaseAdmin, bucket);

    const files: ExportFile[] = [];
    const exportResults: ExportResult[] = [];
    let timedOut = false;

    for (const tableName of tablesToExport) {
      // Check if we're running low on time
      if (Date.now() - startTime > MAX_RUNTIME_MS) {
        console.log(`Approaching timeout after ${tablesToExport.indexOf(tableName)} tables, returning partial results`);
        timedOut = true;
        break;
      }
      let totalRows = 0;
      let part = 1;
      let pagesInCurrentPart = 0;
      let headers: string[] | null = null;
      let csvLines: string[] = [];

      const uploadPart = async () => {
        if (!headers) return;
        if (csvLines.length === 0) return;

        const partName = String(part).padStart(3, '0');
        const path = `${basePrefix}/${tableName}__part${partName}.csv`;
        const content = [`${headers.map((h) => `"${h}"`).join(',')}`, ...csvLines].join('\n');

        const { error: uploadError } = await supabaseAdmin.storage
          .from(bucket)
          .upload(path, new TextEncoder().encode(content), {
            contentType: 'text/csv;charset=utf-8; charset=utf-8',
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`Upload failed for ${tableName} part ${part}: ${uploadError.message}`);
        }

        const { data: signed, error: signError } = await supabaseAdmin.storage
          .from(bucket)
          .createSignedUrl(path, 86400);

        if (signError || !signed?.signedUrl) {
          throw new Error(`Signed URL failed for ${tableName} part ${part}: ${signError?.message || 'unknown'}`);
        }

        files.push({
          table: tableName,
          part,
          rows: csvLines.length,
          path,
          signedUrl: signed.signedUrl,
        });

        part += 1;
        pagesInCurrentPart = 0;
        // Clear array in-place to help garbage collection
        csvLines.length = 0;
      };

      try {
        // First get total count for this table to verify we export everything
        const { count: expectedCount } = await supabaseAdmin
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        console.log(`Table ${tableName}: expecting ${expectedCount ?? '?'} rows`);

        for (let offset = 0; ; offset += PAGE_SIZE) {
          // Use explicit ordering to guarantee consistent pagination
          // Order by primary key (most tables have 'id', fallback to 'created_at' or first column)
          const { data, error } = await supabaseAdmin
            .from(tableName)
            .select('*')
            .order('id', { ascending: true, nullsFirst: false })
            .range(offset, offset + PAGE_SIZE - 1);

          if (error) {
            // If 'id' column doesn't exist, retry without ordering (rare edge case)
            if (error.message.includes('column') && error.message.includes('id')) {
              const { data: fallbackData, error: fallbackError } = await supabaseAdmin
                .from(tableName)
                .select('*')
                .range(offset, offset + PAGE_SIZE - 1);

              if (fallbackError) throw new Error(fallbackError.message);
              if (!fallbackData || fallbackData.length === 0) break;

              if (!headers) headers = Object.keys(fallbackData[0] ?? {});
              csvLines.push(...toCsvLines(fallbackData as Record<string, unknown>[], headers));
              totalRows += fallbackData.length;
              pagesInCurrentPart += 1;

              if (pagesInCurrentPart >= PAGES_PER_PART) await uploadPart();
              continue;
            }
            throw new Error(error.message);
          }

          if (!data || data.length === 0) {
            break;
          }

          if (!headers) {
            headers = Object.keys(data[0] ?? {});
          }

          csvLines.push(...toCsvLines(data as Record<string, unknown>[], headers));
          totalRows += data.length;
          pagesInCurrentPart += 1;

          if (pagesInCurrentPart >= PAGES_PER_PART) {
            await uploadPart();
          }

          // If we got fewer rows than requested, we've reached the end
          if (data.length < PAGE_SIZE) {
            break;
          }
        }

        // flush remaining
        await uploadPart();

        // If table had 0 rows, still create an empty file so the user gets the CSV
        if (totalRows === 0) {
          const path = `${basePrefix}/${tableName}.csv`;
          const { error: uploadError } = await supabaseAdmin.storage
            .from(bucket)
            .upload(path, new TextEncoder().encode(''), {
              contentType: 'text/csv;charset=utf-8; charset=utf-8',
              upsert: true,
            });

          if (!uploadError) {
            const { data: signed } = await supabaseAdmin.storage
              .from(bucket)
              .createSignedUrl(path, 86400);
            if (signed?.signedUrl) {
              files.push({ table: tableName, part: 1, rows: 0, path, signedUrl: signed.signedUrl });
            }
          }
        }

        const partsForTable = files.filter((f) => f.table === tableName).length;

        // Verify we got all rows
        if (expectedCount !== null && expectedCount !== undefined && totalRows !== expectedCount) {
          console.warn(`Table ${tableName}: exported ${totalRows} rows but expected ${expectedCount}`);
          exportResults.push({
            table: tableName,
            rows: totalRows,
            parts: partsForTable,
            error: `Partial export: got ${totalRows} of ${expectedCount} rows`,
          });
        } else {
          console.log(`Table ${tableName}: successfully exported ${totalRows} rows in ${partsForTable} parts`);
          exportResults.push({ table: tableName, rows: totalRows, parts: partsForTable });
        }
      } catch (err) {
        console.error(`Table ${tableName} export failed:`, err);
        exportResults.push({ table: tableName, rows: 0, parts: 0, error: String(err) });
      }
    }

    // Log audit entry (best-effort)
    try {
      await supabaseAdmin.from('admin_audit_activity').insert({
        admin_id: user.id,
        action_type: 'bulk_export',
        action_category: 'data_access',
        target_entity: 'database',
        target_id: null,
        old_value: null,
        new_value: {
          tables: exportResults.length,
          rows: exportResults.reduce((s, r) => s + r.rows, 0),
          files: files.length,
        },
        impact_score: 8,
      });
    } catch (_e) {
      // ignore
    }

    return new Response(
      JSON.stringify({
        success: true,
        exportResults,
        files,
        maxTablesPerCall: MAX_TABLES_PER_CALL,
        totalTables: exportResults.length,
        successfulTables: exportResults.filter((r) => !r.error).length,
        totalRows: exportResults.reduce((sum, r) => sum + r.rows, 0),
        expiresIn: '24 hours',
        timedOut,
        runtimeMs: Date.now() - startTime,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Bulk export error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Export failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
