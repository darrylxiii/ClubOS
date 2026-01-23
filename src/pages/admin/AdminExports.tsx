import { useCallback, useState } from 'react';

import { AppLayout } from '@/components/AppLayout';
import { RoleGate } from '@/components/RoleGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { notify } from '@/lib/notify';

async function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'application/sql;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function fetchDumpText(functionName: 'schema-dump' | 'data-dump') {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const res = await fetch(`${baseUrl}/functions/v1/${functionName}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const text = await res.text();
  if (!res.ok) {
    // If function returns JSON error, keep raw text for debugging.
    throw new Error(text || `Request failed (${res.status})`);
  }

  if (!text.trim()) {
    throw new Error('Empty response');
  }

  return text;
}

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
  resumeCursor:
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
        orderBy: string;
        offset: number;
        partIndex: number;
      }
    | null;
  done: boolean;
};

async function callDataDump(payload: {
  exportId?: string;
  createdAt?: string;
  resumeCursor?: ExportResponse['resumeCursor'];
}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const res = await fetch(`${baseUrl}/functions/v1/data-dump`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(text || `Request failed (${res.status})`);
  }
  return JSON.parse(text) as ExportResponse;
}

async function downloadJsonFile(filename: string, data: unknown) {
  const content = JSON.stringify(data, null, 2);
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function AdminExports() {
  const [busy, setBusy] = useState<'schema' | 'data' | null>(null);
  const [lastDataExport, setLastDataExport] = useState<{
    exportId: string;
    createdAt: string;
    expiresInSeconds: number;
    files: ExportFile[];
    warnings: string[];
  } | null>(null);

  const handleDownload = useCallback(async (kind: 'schema' | 'data') => {
    try {
      setBusy(kind);

      if (kind === 'schema') {
        const dumpText = await fetchDumpText('schema-dump');
        await downloadTextFile('schema.sql', dumpText);
        notify.success('Download ready', { description: 'schema.sql downloaded' });
        return;
      }

      // Data export: batch across multiple function calls and return a manifest.
      setLastDataExport(null);
      let exportId: string | undefined;
      let createdAt: string | undefined;
      let resumeCursor: ExportResponse['resumeCursor'] = null;
      let allFiles: ExportFile[] = [];
      let allWarnings: string[] = [];
      let expiresInSeconds = 0;

      // Keep calling until done.
      // Note: Each backend call has its own runtime limit; this loop allows large exports.
      for (;;) {
        const resp = await callDataDump({ exportId, createdAt, resumeCursor });
        exportId = resp.exportId;
        createdAt = resp.createdAt;
        expiresInSeconds = resp.expiresInSeconds;
        allFiles = allFiles.concat(resp.files);
        allWarnings = allWarnings.concat(resp.warnings);
        resumeCursor = resp.resumeCursor;

        if (resp.done) break;
      }

      const manifest = {
        exportId: exportId!,
        createdAt: createdAt!,
        expiresInSeconds,
        runOrderNotes: [
          '1) Run schema.sql first.',
          '2) Then run files below in order: preamble → table parts → epilogue.',
          '3) Signed URLs expire; download the files promptly.',
        ],
        files: allFiles,
        warnings: allWarnings,
      };

      await downloadJsonFile(`export-${exportId}.manifest.json`, manifest);
      setLastDataExport({
        exportId: exportId!,
        createdAt: createdAt!,
        expiresInSeconds,
        files: allFiles,
        warnings: allWarnings,
      });

      notify.success('Export ready', { description: 'Manifest downloaded' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      notify.error('Export failed', { description: message });
    } finally {
      setBusy(null);
    }
  }, []);

  const handleDownloadAllParts = useCallback(async () => {
    if (!lastDataExport) return;

    try {
      setBusy('data');
      // Download sequentially to avoid browser throttling.
      for (const f of lastDataExport.files) {
        const a = document.createElement('a');
        a.href = f.signedUrl;
        a.download = f.path.split('/').pop() || 'export.sql';
        document.body.appendChild(a);
        a.click();
        a.remove();
        // Small delay to avoid popup blockers / throttling.
        await new Promise((r) => setTimeout(r, 150));
      }
      notify.success('Downloads started', { description: 'All parts queued' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      notify.error('Download failed', { description: message });
    } finally {
      setBusy(null);
    }
  }, [lastDataExport]);

  return (
    <AppLayout>
      <RoleGate allowedRoles={['admin']}>
        <div className="container mx-auto px-4 py-6 max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle>Database exports</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                One-time admin export. These downloads are generated on demand and require an authenticated session.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  onClick={() => handleDownload('schema')}
                  disabled={busy !== null}
                >
                  {busy === 'schema' ? 'Generating…' : 'Download schema.sql'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleDownload('data')}
                  disabled={busy !== null}
                >
                  {busy === 'data' ? 'Generating…' : 'Generate data export (manifest)'}
                </Button>
              </div>

              {lastDataExport && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Export {lastDataExport.exportId} ready. URLs expire in ~{Math.round(
                      lastDataExport.expiresInSeconds / 60,
                    )}m.
                  </p>
                  {lastDataExport.warnings.length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium text-foreground">Warnings</p>
                      <ul className="list-disc pl-5">
                        {lastDataExport.warnings.slice(0, 8).map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                        {lastDataExport.warnings.length > 8 && (
                          <li>…and {lastDataExport.warnings.length - 8} more (see manifest)</li>
                        )}
                      </ul>
                    </div>
                  )}
                  <div>
                    <Button
                      variant="outline"
                      onClick={handleDownloadAllParts}
                      disabled={busy !== null}
                    >
                      Download all SQL parts
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </RoleGate>
    </AppLayout>
  );
}
