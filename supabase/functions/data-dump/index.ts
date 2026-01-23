import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

import { authenticateUser, requireRole } from '../_shared/auth-helpers.ts';
import { createErrorResponse } from '../_shared/error-responses.ts';
import { getCorsHeaders, handleCorsPreFlight } from '../_shared/cors-config.ts';

type TableRef = { schema_name: string; table_name: string };

type ResumeCursor = {
  tableIndex: number;
  offset: number;
};

type ExportFile = {
  path: string;
  signedUrl: string;
  kind: 'preamble' | 'table-part' | 'epilogue';
  table?: { schema: string; name: string };
  partIndex?: number;
};

type ExportResponse = {
  exportId: string;
  createdAt: string;
  expiresInSeconds: number;
  files: ExportFile[];
  warnings: string[];
  resumeCursor: ResumeCursor | null;
  done: boolean;
};

function pad4(n: number) {
  return String(n).padStart(4, '0');
}

function qi(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function sqlStringLiteral(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

function sqlValue(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';

  // PostgREST returns dates/timestamps as strings.
  if (typeof value === 'string') return sqlStringLiteral(value);

  // Arrays/objects: best-effort JSON literal.
  // NOTE: This may not perfectly preserve certain PostgreSQL-specific types, but is safe as a literal.
  try {
    return sqlStringLiteral(JSON.stringify(value));
  } catch {
    return 'NULL';
  }
}

async function uploadText(
  // Supabase JS types in Deno are heavily generic; runtime client is fine.
  supabaseAdmin: any,
  bucket: string,
  path: string,
  content: string,
) {
  const body = new TextEncoder().encode(content);
  const { error } = await supabaseAdmin.storage.from(bucket).upload(path, body, {
    contentType: 'application/sql; charset=utf-8',
    upsert: true,
  });
  if (error) throw new Error(error.message);
}

async function sign(
  // Supabase JS types in Deno are heavily generic; runtime client is fine.
  supabaseAdmin: any,
  bucket: string,
  path: string,
  expiresInSeconds: number,
) {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);
  if (error || !data?.signedUrl) throw new Error(error?.message || 'Failed to create signed url');
  return data.signedUrl;
}

function buildPreamble(tables: TableRef[], exportId: string, createdAt: string) {
  const lines: string[] = [];
  lines.push('-- The Quantum Club — admin export');
  lines.push(`-- export_id: ${exportId}`);
  lines.push(`-- created_at: ${createdAt}`);
  lines.push('');
  lines.push('BEGIN;');
  lines.push('');
  lines.push('-- Disable triggers to allow clean restores.');
  for (const t of tables) {
    lines.push(`ALTER TABLE ${qi(t.schema_name)}.${qi(t.table_name)} DISABLE TRIGGER ALL;`);
  }
  lines.push('');
  return lines.join('\n');
}

function buildEpilogue(tables: TableRef[]) {
  const lines: string[] = [];
  lines.push('');
  lines.push('-- Re-enable triggers');
  for (const t of tables) {
    lines.push(`ALTER TABLE ${qi(t.schema_name)}.${qi(t.table_name)} ENABLE TRIGGER ALL;`);
  }
  lines.push('');
  lines.push('COMMIT;');
  lines.push('');
  return lines.join('\n');
}

function buildInsertStatements(
  schema: string,
  table: string,
  rows: Record<string, unknown>[],
  columns: string[],
) {
  const lines: string[] = [];
  if (rows.length === 0) {
    lines.push(`-- ${schema}.${table}: (no rows)`);
    return lines.join('\n');
  }

  const colsSql = columns.map(qi).join(', ');
  for (const row of rows) {
    const valuesSql = columns.map((c) => sqlValue(row[c])).join(', ');
    lines.push(
      `INSERT INTO ${qi(schema)}.${qi(table)} (${colsSql}) OVERRIDING SYSTEM VALUE VALUES (${valuesSql});`,
    );
  }
  return lines.join('\n') + '\n';
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req, true);

  if (req.method === 'OPTIONS') {
    return handleCorsPreFlight(req);
  }

  try {
    const auth = await authenticateUser(req.headers.get('authorization'));
    requireRole(auth, ['admin']);

    if (req.method !== 'POST') {
      return createErrorResponse({
        message: 'Method not allowed',
        status: 405,
        corsHeaders,
      });
    }

    const bodyText = await req.text();
    const body = bodyText ? JSON.parse(bodyText) : {};
    const resumeCursor: ResumeCursor | null = body?.resumeCursor ?? null;
    const exportId: string = body?.exportId ?? crypto.randomUUID();

    const createdAt: string = body?.createdAt ?? new Date().toISOString();
    const bucket = 'admin-exports';
    const prefix = `sql/${exportId}`;

    const expiresInSeconds = 60 * 60; // 1 hour
    const pageSize = 1000;
    const watchdogMs = 55_000;

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: tables, error: tableError } = await supabaseAdmin.rpc('tqc__list_user_tables');
    if (tableError) throw new Error(tableError.message);

    const tableList = (tables || []) as TableRef[];
    const warnings: string[] = [];
    const files: ExportFile[] = [];

    const startTime = Date.now();

    // Upload preamble only on first call.
    if (!resumeCursor) {
      const preamblePath = `${prefix}/data-preamble.sql`;
      await uploadText(supabaseAdmin, bucket, preamblePath, buildPreamble(tableList, exportId, createdAt));
      files.push({
        path: preamblePath,
        signedUrl: await sign(supabaseAdmin, bucket, preamblePath, expiresInSeconds),
        kind: 'preamble',
      });
    }

    let tableIndex = resumeCursor?.tableIndex ?? 0;
    let offset = resumeCursor?.offset ?? 0;

    for (; tableIndex < tableList.length; tableIndex += 1) {
      const t = tableList[tableIndex];
      const schema = t.schema_name;
      const table = t.table_name;

      // Infer columns and choose ordering.
      // NOTE: We only use the first row to infer keys; if table is empty, we still export a marker.
      const { data: sampleRows, error: sampleError } = await supabaseAdmin
        .schema(schema)
        .from(table)
        .select('*')
        .limit(1);
      if (sampleError) {
        warnings.push(`Skipped ${schema}.${table}: ${sampleError.message}`);
        offset = 0;
        continue;
      }

      const sample = (sampleRows?.[0] as Record<string, unknown> | undefined) ?? undefined;
      const columns = sample ? Object.keys(sample) : [];
      const orderBy = columns.includes('id') ? 'id' : columns[0];
      if (!orderBy) {
        // Empty table with no columns returned (rare). Still proceed.
        const emptyPath = `${prefix}/${schema}.${table}/part-${pad4(0)}.sql`;
        await uploadText(supabaseAdmin, bucket, emptyPath, `-- ${schema}.${table}: (no columns/rows)\n`);
        files.push({
          path: emptyPath,
          signedUrl: await sign(supabaseAdmin, bucket, emptyPath, expiresInSeconds),
          kind: 'table-part',
          table: { schema, name: table },
          partIndex: 0,
        });
        offset = 0;
        continue;
      }
      if (!columns.includes('id')) {
        warnings.push(`Ordering ${schema}.${table} by '${orderBy}' (no id column detected).`);
      }

      let partIndex = Math.floor(offset / pageSize);
      for (;;) {
        if (Date.now() - startTime > watchdogMs) {
          return new Response(
            JSON.stringify({
              exportId,
              createdAt,
              expiresInSeconds,
              files,
              warnings,
              resumeCursor: { tableIndex, offset },
              done: false,
            } satisfies ExportResponse),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            },
          );
        }

        const query = supabaseAdmin
          .schema(schema)
          .from(table)
          .select('*')
          .order(orderBy as any, { ascending: true })
          .range(offset, offset + pageSize - 1);

        const { data: rows, error: pageError } = await query;
        if (pageError) {
          warnings.push(`Failed ${schema}.${table} @ offset ${offset}: ${pageError.message}`);
          break;
        }

        const pageRows = (rows || []) as Record<string, unknown>[];
        if (pageRows.length === 0) {
          // If offset was 0, ensure we still write a small file marking empty table.
          if (offset === 0) {
            const emptyPath = `${prefix}/${schema}.${table}/part-${pad4(0)}.sql`;
            await uploadText(supabaseAdmin, bucket, emptyPath, `-- ${schema}.${table}: (no rows)\n`);
            files.push({
              path: emptyPath,
              signedUrl: await sign(supabaseAdmin, bucket, emptyPath, expiresInSeconds),
              kind: 'table-part',
              table: { schema, name: table },
              partIndex: 0,
            });
          }
          break;
        }

        const partPath = `${prefix}/${schema}.${table}/part-${pad4(partIndex)}.sql`;
        const sql = buildInsertStatements(schema, table, pageRows, columns);
        await uploadText(supabaseAdmin, bucket, partPath, sql);
        files.push({
          path: partPath,
          signedUrl: await sign(supabaseAdmin, bucket, partPath, expiresInSeconds),
          kind: 'table-part',
          table: { schema, name: table },
          partIndex,
        });

        offset += pageRows.length;
        partIndex += 1;
        if (pageRows.length < pageSize) {
          break;
        }
      }

      // Next table
      offset = 0;
    }

    // Upload epilogue only on completion.
    const epiloguePath = `${prefix}/data-epilogue.sql`;
    await uploadText(supabaseAdmin, bucket, epiloguePath, buildEpilogue(tableList));
    files.push({
      path: epiloguePath,
      signedUrl: await sign(supabaseAdmin, bucket, epiloguePath, expiresInSeconds),
      kind: 'epilogue',
    });

    return new Response(
      JSON.stringify({
        exportId,
        createdAt,
        expiresInSeconds,
        files,
        warnings,
        resumeCursor: null,
        done: true,
      } satisfies ExportResponse),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const m = message.toLowerCase();
    const status =
      m.includes('missing authorization') ||
      m.includes('invalid or expired token') ||
      m.includes('unauthorized')
        ? 401
        : m.includes('required roles') || m.includes('forbidden')
          ? 403
          : 500;

    return createErrorResponse({
      message,
      status,
      corsHeaders,
    });
  }
});
