import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

import { authenticateUser, requireRole } from '../_shared/auth-helpers.ts';
import { createErrorResponse } from '../_shared/error-responses.ts';
import { getCorsHeaders, handleCorsPreFlight } from '../_shared/cors-config.ts';

type TableRef = { schema_name: string; table_name: string };

type ResumeCursor =
  | {
      tableIndex: number;
      mode: 'keyset';
      keyColumn: string;
      lastKey: string | number | null;
      partIndex: number;
    }
  | {
      tableIndex: number;
      mode: 'offset';
      offset: number;
      partIndex: number;
      orderBy: string;
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

type OrderingKeyResp = { key_column: string | null; strategy: string };

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

async function getTableColumns(supabaseAdmin: any, schema: string, table: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin.rpc('tqc__table_columns', {
    p_schema: schema,
    p_table: table,
  });
  if (error) throw new Error(error.message);
  return Array.isArray(data) ? (data as string[]) : [];
}

async function getOrderingKey(
  supabaseAdmin: any,
  schema: string,
  table: string,
): Promise<OrderingKeyResp> {
  const { data, error } = await supabaseAdmin.rpc('tqc__table_ordering_key', {
    p_schema: schema,
    p_table: table,
  });
  if (error) throw new Error(error.message);
  const row = (Array.isArray(data) ? data[0] : data) as any;
  return {
    key_column: (row?.key_column ?? null) as string | null,
    strategy: String(row?.strategy ?? 'none'),
  };
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
    const fallbackPageSize = 200;
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

    for (; tableIndex < tableList.length; tableIndex += 1) {
      const t = tableList[tableIndex];
      const schema = t.schema_name;
      const table = t.table_name;

      const columns = await getTableColumns(supabaseAdmin, schema, table);
      if (columns.length === 0) {
        const emptyPath = `${prefix}/${schema}.${table}/part-${pad4(0)}.sql`;
        await uploadText(supabaseAdmin, bucket, emptyPath, `-- ${schema}.${table}: (no columns/rows)\n`);
        files.push({
          path: emptyPath,
          signedUrl: await sign(supabaseAdmin, bucket, emptyPath, expiresInSeconds),
          kind: 'table-part',
          table: { schema, name: table },
          partIndex: 0,
        });
        continue;
      }

      const ordering = await getOrderingKey(supabaseAdmin, schema, table);
      const canKeyset = !!ordering.key_column && columns.includes(ordering.key_column);

      // Resume state per table
      let partIndex = 0;
      let lastKey: string | number | null = null;
      let offset = 0;
      let mode: 'keyset' | 'offset' = canKeyset ? 'keyset' : 'offset';
      let orderBy = canKeyset ? ordering.key_column! : (columns.includes('id') ? 'id' : columns[0]);

      if (resumeCursor && resumeCursor.tableIndex === tableIndex) {
        if (resumeCursor.mode === 'keyset') {
          mode = 'keyset';
          orderBy = resumeCursor.keyColumn;
          lastKey = resumeCursor.lastKey;
          partIndex = resumeCursor.partIndex;
        } else {
          mode = 'offset';
          orderBy = resumeCursor.orderBy;
          offset = resumeCursor.offset;
          partIndex = resumeCursor.partIndex;
        }
      }

      if (mode === 'offset' && !orderBy) {
        warnings.push(`Skipped ${schema}.${table}: could not determine ordering column`);
        continue;
      }

      if (mode === 'offset') {
        warnings.push(
          `Exporting ${schema}.${table} using OFFSET pagination (may be slow for large tables).`,
        );
      } else {
        console.log(
          `[data-dump] ${exportId} ${schema}.${table} keyset orderBy=${orderBy} strategy=${ordering.strategy}`,
        );
      }

      const perTablePageSize = mode === 'offset' ? fallbackPageSize : pageSize;

      for (;;) {
        if (Date.now() - startTime > watchdogMs) {
          return new Response(
            JSON.stringify({
              exportId,
              createdAt,
              expiresInSeconds,
              files,
              warnings,
              resumeCursor:
                mode === 'keyset'
                  ? {
                      tableIndex,
                      mode: 'keyset',
                      keyColumn: orderBy,
                      lastKey,
                      partIndex,
                    }
                  : {
                      tableIndex,
                      mode: 'offset',
                      orderBy,
                      offset,
                      partIndex,
                    },
              done: false,
            } satisfies ExportResponse),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            },
          );
        }

        let query = supabaseAdmin
          .schema(schema)
          .from(table)
          .select('*')
          .order(orderBy as any, { ascending: true });

        if (mode === 'keyset' && lastKey !== null && lastKey !== undefined) {
          query = query.gt(orderBy as any, lastKey as any);
        }

        if (mode === 'offset') {
          query = query.range(offset, offset + perTablePageSize - 1);
        } else {
          query = query.limit(perTablePageSize);
        }

        const { data: rows, error: pageError } = await query;
        if (pageError) {
          const where = mode === 'offset' ? `offset ${offset}` : `lastKey ${String(lastKey)}`;
          warnings.push(`Failed ${schema}.${table} @ ${where}: ${pageError.message}`);
          break;
        }

        const pageRows = (rows || []) as Record<string, unknown>[];
        if (pageRows.length === 0) {
          // If offset was 0, ensure we still write a small file marking empty table.
          if (mode === 'offset' ? offset === 0 : partIndex === 0) {
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

        // Advance cursor
        if (mode === 'offset') {
          offset += pageRows.length;
        } else {
          const lk = pageRows[pageRows.length - 1]?.[orderBy];
          if (lk === null || lk === undefined) {
            warnings.push(
              `Keyset cursor for ${schema}.${table} has null/undefined key '${orderBy}'. Falling back to OFFSET next run.`,
            );
            // Fall back to offset from scratch is expensive; instead stop here so UI can retry.
            break;
          }
          lastKey = lk as any;
        }

        partIndex += 1;
        if (pageRows.length < perTablePageSize) {
          break;
        }
      }

      // Next table resets happen naturally by reinitializing loop vars.
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
