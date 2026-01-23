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

export default function AdminExports() {
  const [busy, setBusy] = useState<'schema' | 'data' | null>(null);

  const handleDownload = useCallback(async (kind: 'schema' | 'data') => {
    try {
      setBusy(kind);
      const fn = kind === 'schema' ? 'schema-dump' : 'data-dump';
      const filename = kind === 'schema' ? 'schema.sql' : 'data.sql';

      const dumpText = await fetchDumpText(fn);
      await downloadTextFile(filename, dumpText);

      notify.success('Download ready', { description: `${filename} downloaded` });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      notify.error('Export failed', { description: message });
    } finally {
      setBusy(null);
    }
  }, []);

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
                  {busy === 'data' ? 'Generating…' : 'Download data.sql'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </RoleGate>
    </AppLayout>
  );
}
