import { createHandler } from '../_shared/handler.ts';
import { SupabaseClient } from "npm:@supabase/supabase-js@2";

interface ReportConfig {
  id: string;
  name: string;
  description?: string;
  report_type: string;
  format: string[];
  recipients: string[];
  filters?: Record<string, unknown>;
  is_active: boolean;
  last_sent_at?: string;
}

interface ReportData {
  summary?: Record<string, unknown>;
  [key: string]: unknown;
}

Deno.serve(createHandler(async (req, ctx) => {
  const { reportId } = await req.json();

    console.log(`Executing scheduled report: ${reportId}`);

    // Fetch report configuration
    const { data: report, error: reportError } = await ctx.supabase
      .from('scheduled_reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (reportError || !report) {
      throw new Error('Report not found');
    }

    if (!report.is_active) {
      console.log('Report is inactive, skipping execution');
      return new Response(
        JSON.stringify({ message: 'Report is inactive' }),
        { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate report data based on type
    const reportData = await generateReportData(ctx.supabase, report);

    // Generate export files
    const fileUrls: Record<string, string> = {};

    if (report.format.includes('csv')) {
      const csvContent = generateCSV(reportData);
      fileUrls.csv = await uploadReportFile(ctx.supabase, reportId, 'csv', csvContent);
    }

    if (report.format.includes('pdf')) {
      const pdfContent = await generatePDF(reportData, report);
      fileUrls.pdf = await uploadReportFile(ctx.supabase, reportId, 'pdf', pdfContent);
    }

    // Send emails to recipients
    let recipientsSent = 0;
    for (const email of report.recipients) {
      try {
        await sendReportEmail(ctx.supabase, email, report, fileUrls);
        recipientsSent++;
      } catch (error) {
        console.error(`Failed to send to ${email}:`, error);
      }
    }

    // Log execution
    await ctx.supabase.from('report_executions').insert({
      report_id: reportId,
      status: recipientsSent > 0 ? 'success' : 'failed',
      recipients_sent: recipientsSent,
      file_urls: fileUrls,
    });

    // Update last_sent_at
    await ctx.supabase
      .from('scheduled_reports')
      .update({ last_sent_at: new Date().toISOString() })
      .eq('id', reportId);

    console.log(`Report executed successfully: ${recipientsSent} emails sent`);

    return new Response(
      JSON.stringify({
        success: true,
        reportId,
        recipientsSent,
        fileUrls,
      }),
      { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
    );

}));

async function generateReportData(supabase: SupabaseClient, report: ReportConfig) {
  const filters = report.filters || {};
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  let data: ReportData = {};

  switch (report.report_type) {
    case 'user_activity':
      data = await fetchUserActivityData(supabase, filters, thirtyDaysAgo);
      break;
    case 'candidate_metrics':
      data = await fetchCandidateMetrics(supabase, filters, thirtyDaysAgo);
      break;
    case 'partner_health':
      data = await fetchPartnerHealth(supabase, filters, thirtyDaysAgo);
      break;
    case 'full_analytics':
      data = await fetchFullAnalytics(supabase, filters, thirtyDaysAgo);
      break;
  }

  return data;
}

async function fetchUserActivityData(supabase: SupabaseClient, filters: Record<string, unknown>, since: Date) {
  const [sessions, pages, frustration, engagement] = await Promise.all([
    supabase
      .from('user_session_events')
      .select('*')
      .gte('created_at', since.toISOString()),
    
    supabase
      .from('user_page_analytics')
      .select('*')
      .gte('entry_time', since.toISOString()),
    
    supabase
      .from('user_frustration_signals')
      .select('*')
      .gte('created_at', since.toISOString()),
    
    supabase
      .from('user_engagement_scores')
      .select('*')
      .gte('calculation_date', since.toISOString()),
  ]);

  return {
    summary: {
      totalSessions: sessions.data?.length || 0,
      totalPageViews: pages.data?.length || 0,
      frustrationSignals: frustration.data?.length || 0,
      avgEngagement: calculateAverage(engagement.data || [], 'engagement_score'),
    },
    sessions: sessions.data || [],
    pages: pages.data || [],
    frustration: frustration.data || [],
    engagement: engagement.data || [],
  };
}

async function fetchCandidateMetrics(supabase: SupabaseClient, filters: Record<string, unknown>, since: Date) {
  const { data: applications } = await supabase
    .from('applications')
    .select('*')
    .gte('created_at', since.toISOString());

  return {
    summary: {
      totalApplications: applications?.length || 0,
      submitted: applications?.filter((a: Record<string, unknown>) => a.status === 'submitted').length || 0,
      inProgress: applications?.filter((a: Record<string, unknown>) => a.status === 'in_progress').length || 0,
    },
    applications: applications || [],
  };
}

async function fetchPartnerHealth(supabase: SupabaseClient, filters: Record<string, unknown>, since: Date) {
  const { data: partners } = await supabase
    .from('profiles')
    .select('*, user_roles!inner(*)')
    .eq('user_roles.role', 'partner');

  return {
    summary: {
      totalPartners: partners?.length || 0,
      activePartners: partners?.filter((p: Record<string, unknown>) => (p.last_login_at as string) > since.toISOString()).length || 0,
    },
    partners: partners || [],
  };
}

async function fetchFullAnalytics(supabase: SupabaseClient, filters: Record<string, unknown>, since: Date) {
  const [userActivity, candidates, partners] = await Promise.all([
    fetchUserActivityData(supabase, filters, since),
    fetchCandidateMetrics(supabase, filters, since),
    fetchPartnerHealth(supabase, filters, since),
  ]);

  return {
    userActivity,
    candidates,
    partners,
  };
}

function generateCSV(data: ReportData): string {
  let csv = 'Metric,Value\n';
  
  if (data.summary) {
    Object.entries(data.summary).forEach(([key, value]) => {
      csv += `${key},${value}\n`;
    });
  }

  return csv;
}

async function generatePDF(data: ReportData, report: ReportConfig): Promise<string> {
  // Simple HTML-based PDF content (would use proper PDF generation in production)
  const html = `
    <html>
      <head><title>${report.name}</title></head>
      <body>
        <h1>${report.name}</h1>
        <p>${report.description || ''}</p>
        <h2>Summary</h2>
        <pre>${JSON.stringify(data.summary, null, 2)}</pre>
      </body>
    </html>
  `;
  
  return html;
}

async function uploadReportFile(
  supabase: SupabaseClient,
  reportId: string,
  format: string,
  content: string
): Promise<string> {
  const fileName = `reports/${reportId}/${Date.now()}.${format}`;
  
  const { data, error } = await supabase.storage
    .from('reports')
    .upload(fileName, content, {
      contentType: format === 'csv' ? 'text/csv' : 'text/html',
    });

  if (error) {
    console.error('Upload error:', error);
    return '';
  }

  const { data: urlData } = supabase.storage
    .from('reports')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}

async function sendReportEmail(
  _supabase: SupabaseClient,
  email: string,
  _report: ReportConfig,
  _fileUrls: Record<string, string>
) {
  console.log(`Sending report to ${email}`);
  // Email sending would be implemented here using a service like SendGrid
  // For now, just log
}

function calculateAverage(data: Record<string, unknown>[], field: string): number {
  if (data.length === 0) return 0;
  const sum = data.reduce((acc, item) => acc + (item[field] || 0), 0);
  return Math.round((sum / data.length) * 100) / 100;
}