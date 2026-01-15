import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { publicCorsHeaders, handleCorsPreFlight, getCorsHeaders } from '../_shared/cors-config.ts';

/**
 * KPI Data Export Edge Function
 *
 * Exports KPI data in various formats for BI tools and data science analysis:
 * - CSV: Spreadsheet-friendly format
 * - JSON: API consumption
 * - NDJSON: Streaming/large datasets (newline-delimited JSON)
 *
 * Supports exporting from:
 * - kpi_daily_snapshots (daily data)
 * - kpi_history (historical data)
 * - kpi_aggregated_summaries (aggregated data)
 * - All KPI source tables combined
 */

interface ExportRequest {
  format: 'csv' | 'json' | 'ndjson';
  data_source: 'snapshots' | 'history' | 'aggregated' | 'all' | 'unified';
  domain?: string;
  kpi_name?: string;
  start_date?: string; // ISO date
  end_date?: string;   // ISO date
  include_statistics?: boolean;
  include_metadata?: boolean;
  limit?: number;
}

interface KPIRecord {
  date: string;
  domain: string;
  category: string;
  kpi_name: string;
  value: number;
  target_value?: number;
  status?: string;
  trend?: string;
  day_over_day_change?: number;
  week_over_week_change?: number;
  month_over_month_change?: number;
  z_score?: number;
  percentile_rank?: number;
  is_anomaly?: boolean;
  metadata?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreFlight(publicCorsHeaders);
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[${requestId}] export-kpi-data: Starting export`);

  try {
    // Verify authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonErrorResponse('Missing authorization header', 401, req);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user has permission (admin or strategist role)
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return jsonErrorResponse('Invalid authorization', 401, req);
    }

    // Check user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'strategist', 'analyst'].includes(profile.role || '')) {
      return jsonErrorResponse('Insufficient permissions. Required: admin, strategist, or analyst role', 403, req);
    }

    // Parse request body
    let body: ExportRequest;
    try {
      body = await req.json();
    } catch {
      return jsonErrorResponse('Invalid request body', 400, req);
    }

    const {
      format = 'json',
      data_source = 'snapshots',
      domain,
      kpi_name,
      start_date,
      end_date,
      include_statistics = true,
      include_metadata = false,
      limit = 10000,
    } = body;

    console.log(`[${requestId}] Export params: format=${format}, source=${data_source}, domain=${domain || 'all'}`);

    // Fetch data based on source
    let records: KPIRecord[] = [];
    const startDt = start_date || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDt = end_date || new Date().toISOString().split('T')[0];

    if (data_source === 'snapshots' || data_source === 'all') {
      const snapshotRecords = await fetchSnapshots(supabase, startDt, endDt, domain, kpi_name, limit);
      records = records.concat(snapshotRecords);
    }

    if (data_source === 'history' || data_source === 'all') {
      const historyRecords = await fetchHistory(supabase, startDt, endDt, domain, kpi_name, limit);
      records = records.concat(historyRecords);
    }

    if (data_source === 'aggregated') {
      const aggregatedRecords = await fetchAggregated(supabase, startDt, endDt, domain, kpi_name, limit);
      records = records.concat(aggregatedRecords);
    }

    if (data_source === 'unified') {
      // Use the unified historical data function
      if (domain && kpi_name) {
        const { data: unifiedData } = await supabase.rpc('get_kpi_historical_data', {
          p_kpi_name: kpi_name,
          p_domain: domain,
          p_start_date: startDt,
          p_end_date: endDt,
        });

        if (unifiedData) {
          records = unifiedData.map((row: any) => ({
            date: row.data_date,
            domain: domain,
            category: '',
            kpi_name: kpi_name,
            value: row.value,
            source: row.source,
          }));
        }
      }
    }

    // Remove metadata if not requested
    if (!include_metadata) {
      records = records.map(({ metadata, ...rest }) => rest as KPIRecord);
    }

    // Remove statistics if not requested
    if (!include_statistics) {
      records = records.map(({ z_score, percentile_rank, day_over_day_change, week_over_week_change, month_over_month_change, ...rest }) => rest as KPIRecord);
    }

    console.log(`[${requestId}] Fetched ${records.length} records`);

    // Log export for GDPR compliance
    await logExport(supabase, user.id, format, data_source, records.length, {
      domain,
      kpi_name,
      start_date: startDt,
      end_date: endDt,
    });

    // Return data in requested format
    switch (format) {
      case 'csv':
        return csvResponse(records, `kpi-export-${data_source}-${startDt}-${endDt}.csv`, req);
      case 'ndjson':
        return ndjsonResponse(records, `kpi-export-${data_source}-${startDt}-${endDt}.ndjson`, req);
      case 'json':
      default:
        return jsonDataResponse({
          success: true,
          export_date: new Date().toISOString(),
          data_source,
          date_range: { start: startDt, end: endDt },
          filters: { domain, kpi_name },
          record_count: records.length,
          data: records,
        }, req);
    }
  } catch (error) {
    console.error(`[${requestId}] Error in export-kpi-data:`, error);
    return jsonErrorResponse(
      error instanceof Error ? error.message : 'Unknown error',
      500,
      req
    );
  }
});

// Fetch from kpi_daily_snapshots
async function fetchSnapshots(
  supabase: ReturnType<typeof createClient>,
  startDate: string,
  endDate: string,
  domain?: string,
  kpiName?: string,
  limit: number = 10000
): Promise<KPIRecord[]> {
  let query = supabase
    .from('kpi_daily_snapshots')
    .select('*')
    .gte('snapshot_date', startDate)
    .lte('snapshot_date', endDate)
    .order('snapshot_date', { ascending: false })
    .limit(limit);

  if (domain) query = query.eq('domain', domain);
  if (kpiName) query = query.eq('kpi_name', kpiName);

  const { data, error } = await query;
  if (error) {
    console.warn('Error fetching snapshots:', error);
    return [];
  }

  return (data || []).map((row) => ({
    date: row.snapshot_date,
    domain: row.domain,
    category: row.category,
    kpi_name: row.kpi_name,
    value: row.value,
    target_value: row.target_value,
    status: row.status,
    trend: row.trend,
    day_over_day_change: row.day_over_day_change,
    week_over_week_change: row.week_over_week_change,
    month_over_month_change: row.month_over_month_change,
    z_score: row.z_score,
    percentile_rank: row.percentile_rank,
    is_anomaly: row.is_anomaly,
    metadata: row.metadata,
  }));
}

// Fetch from kpi_history
async function fetchHistory(
  supabase: ReturnType<typeof createClient>,
  startDate: string,
  endDate: string,
  domain?: string,
  kpiName?: string,
  limit: number = 10000
): Promise<KPIRecord[]> {
  let query = supabase
    .from('kpi_history')
    .select('*')
    .gte('recorded_at', `${startDate}T00:00:00`)
    .lte('recorded_at', `${endDate}T23:59:59`)
    .order('recorded_at', { ascending: false })
    .limit(limit);

  if (domain) query = query.eq('domain', domain);
  if (kpiName) query = query.eq('kpi_name', kpiName);

  const { data, error } = await query;
  if (error) {
    console.warn('Error fetching history:', error);
    return [];
  }

  return (data || []).map((row) => ({
    date: row.recorded_at.split('T')[0],
    domain: row.domain,
    category: row.category,
    kpi_name: row.kpi_name,
    value: row.value,
    target_value: row.target_value,
    status: row.status,
    trend: row.trend,
    metadata: row.metadata,
  }));
}

// Fetch from kpi_aggregated_summaries
async function fetchAggregated(
  supabase: ReturnType<typeof createClient>,
  startDate: string,
  endDate: string,
  domain?: string,
  kpiName?: string,
  limit: number = 10000
): Promise<KPIRecord[]> {
  let query = supabase
    .from('kpi_aggregated_summaries')
    .select('*')
    .gte('period_start', startDate)
    .lte('period_end', endDate)
    .order('period_start', { ascending: false })
    .limit(limit);

  if (domain) query = query.eq('domain', domain);
  if (kpiName) query = query.eq('kpi_name', kpiName);

  const { data, error } = await query;
  if (error) {
    console.warn('Error fetching aggregated data:', error);
    return [];
  }

  return (data || []).map((row) => ({
    date: row.period_start,
    domain: row.domain,
    category: row.category,
    kpi_name: row.kpi_name,
    value: row.avg_value,
    period_type: row.period_type,
    period_end: row.period_end,
    min_value: row.min_value,
    max_value: row.max_value,
    median_value: row.median_value,
    stddev_value: row.stddev_value,
    data_points: row.data_points,
    metadata: row.metadata,
  }));
}

// Log export for GDPR compliance
async function logExport(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  format: string,
  dataSource: string,
  recordCount: number,
  filters: Record<string, unknown>
) {
  try {
    await supabase.from('analytics_export_log').insert({
      user_id: userId,
      export_type: format,
      data_scope: `kpi_${dataSource}`,
      metadata: {
        record_count: recordCount,
        filters,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.warn('Failed to log export:', error);
  }
}

// Response helpers
function jsonErrorResponse(message: string, status: number, req: Request): Response {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status,
    headers: {
      ...getCorsHeaders(req),
      'Content-Type': 'application/json',
    },
  });
}

function jsonDataResponse(data: Record<string, unknown>, req: Request): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      ...getCorsHeaders(req),
      'Content-Type': 'application/json',
    },
  });
}

function csvResponse(records: KPIRecord[], filename: string, req: Request): Response {
  if (records.length === 0) {
    return new Response('', {
      status: 200,
      headers: {
        ...getCorsHeaders(req),
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  }

  // Extract headers from first record
  const headers = Object.keys(records[0]);

  // Build CSV content
  const csvLines = [
    headers.join(','),
    ...records.map((record) =>
      headers
        .map((header) => {
          const value = (record as any)[header];
          if (value === null || value === undefined) return '';
          if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return String(value);
        })
        .join(',')
    ),
  ];

  return new Response(csvLines.join('\n'), {
    status: 200,
    headers: {
      ...getCorsHeaders(req),
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

function ndjsonResponse(records: KPIRecord[], filename: string, req: Request): Response {
  const ndjsonContent = records.map((record) => JSON.stringify(record)).join('\n');

  return new Response(ndjsonContent, {
    status: 200,
    headers: {
      ...getCorsHeaders(req),
      'Content-Type': 'application/x-ndjson',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
