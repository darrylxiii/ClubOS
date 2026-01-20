import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { publicCorsHeaders as corsHeaders } from '../_shared/cors-config.ts';
import JSZip from 'https://esm.sh/jszip@3.10.1';

interface ExportRequest {
  tables?: string[];
  excludeTables?: string[];
}

function convertToCSV(data: Record<string, unknown>[]): string {
  if (!data || data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvRows: string[] = [];
  
  // Add headers
  csvRows.push(headers.map(h => `"${h}"`).join(','));
  
  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      const stringValue = String(value);
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth header
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

      // Helpful debugging for the logged-in user (does not expose data)
      return createAuthErrorResponse(message, status, corsHeaders);
    }

    const user = { id: authContext.userId, email: authContext.email };

    // Parse request body
    const body: ExportRequest = req.method === 'POST' ? await req.json() : {};
    const { tables: requestedTables, excludeTables = [] } = body;

    // Get all public table names using raw SQL via RPC or direct query
    // Since we can't query information_schema directly, we'll use a predefined list
    // or query via RPC function
    
    // For now, let's get tables dynamically by trying common tables
    const { data: tableList, error: tableError } = await supabaseAdmin
      .rpc('get_public_tables');

    let tablesToExport: string[] = [];
    
    if (tableError || !tableList) {
      // Fallback: query each known table from types
      // We'll use a comprehensive list from the schema
      console.log('Using fallback table list');
      tablesToExport = [
        'profiles', 'companies', 'jobs', 'applications', 'bookings',
        'candidate_profiles', 'experience', 'education', 'skills',
        'notifications', 'messages', 'payments', 'invoices',
        'referrals', 'teams', 'projects', 'tasks'
        // This is a subset - the RPC function should be created for full list
      ];
    } else {
      tablesToExport = (tableList as { table_name: string }[]).map(t => t.table_name);
    }

    // Filter tables if specific ones requested
    if (requestedTables && requestedTables.length > 0) {
      tablesToExport = tablesToExport.filter(t => requestedTables.includes(t));
    }

    // Exclude specified tables
    tablesToExport = tablesToExport.filter(t => !excludeTables.includes(t));

    console.log(`Exporting ${tablesToExport.length} tables`);

    // Create ZIP archive
    const zip = new JSZip();
    const exportResults: { table: string; rows: number; error?: string }[] = [];

    // Export each table
    for (const tableName of tablesToExport) {
      try {
        const { data, error } = await supabaseAdmin
          .from(tableName)
          .select('*')
          .limit(50000); // Limit per table to avoid memory issues

        if (error) {
          console.error(`Error exporting ${tableName}:`, error.message);
          exportResults.push({ table: tableName, rows: 0, error: error.message });
          continue;
        }

        if (data && data.length > 0) {
          const csv = convertToCSV(data);
          zip.file(`${tableName}.csv`, csv);
          exportResults.push({ table: tableName, rows: data.length });
        } else {
          // Create empty CSV with headers if possible
          zip.file(`${tableName}.csv`, '');
          exportResults.push({ table: tableName, rows: 0 });
        }
      } catch (err) {
        console.error(`Exception exporting ${tableName}:`, err);
        exportResults.push({ table: tableName, rows: 0, error: String(err) });
      }
    }

    // Generate ZIP blob
    const zipBlob = await zip.generateAsync({ type: 'uint8array' });
    
    // Upload to storage
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `bulk-export-${timestamp}.zip`;

    // Ensure bucket exists (create if needed via API)
    const { error: uploadError } = await supabaseAdmin.storage
      .from('admin-exports')
      .upload(fileName, zipBlob, {
        contentType: 'application/zip',
        upsert: true,
      });

    if (uploadError) {
      // If bucket doesn't exist, return the zip directly as base64
      if (uploadError.message.includes('not found') || uploadError.message.includes('does not exist')) {
        const base64Zip = btoa(String.fromCharCode(...zipBlob));
        return new Response(
          JSON.stringify({
            success: true,
            exportResults,
            totalTables: exportResults.length,
            successfulTables: exportResults.filter(r => !r.error).length,
            totalRows: exportResults.reduce((sum, r) => sum + r.rows, 0),
            downloadMethod: 'base64',
            zipData: base64Zip,
            fileName,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw uploadError;
    }

    // Create signed URL (24 hours)
    const { data: signedUrl, error: signError } = await supabaseAdmin.storage
      .from('admin-exports')
      .createSignedUrl(fileName, 86400);

    if (signError) {
      throw signError;
    }

    // Log audit entry
    await supabaseAdmin.from('admin_audit_activity').insert({
      admin_id: user.id,
      action_type: 'bulk_export',
      action_category: 'data_access',
      target_entity: 'database',
      target_id: null,
      old_value: null,
      new_value: { tables: exportResults.length, rows: exportResults.reduce((s, r) => s + r.rows, 0) },
      impact_score: 8,
    });

    return new Response(
      JSON.stringify({
        success: true,
        downloadUrl: signedUrl.signedUrl,
        expiresIn: '24 hours',
        exportResults,
        totalTables: exportResults.length,
        successfulTables: exportResults.filter(r => !r.error).length,
        totalRows: exportResults.reduce((sum, r) => sum + r.rows, 0),
        fileName,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Bulk export error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Export failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
