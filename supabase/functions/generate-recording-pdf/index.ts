/**
 * Generate Recording PDF Export
 * Creates a branded PDF with transcript, AI analysis, key moments, and action items
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// TQC Brand Colors
const COLORS = {
  gold: '#C9A24E',
  eclipse: '#0E0E10',
  ivory: '#F5F4EF',
  cardBg: '#1a1a1c',
  textSecondary: '#B8B7B3',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { recordingId } = await req.json();

    if (!recordingId) {
      return new Response(JSON.stringify({ error: 'Recording ID required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch recording with all analysis data
    const { data: recording, error: recordingError } = await supabase
      .from('meeting_recordings_extended')
      .select('*')
      .eq('id', recordingId)
      .single();

    if (recordingError || !recording) {
      return new Response(JSON.stringify({ error: 'Recording not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch meeting details if available
    let meetingTitle = recording.title || 'Recording';
    let meetingDate = recording.created_at;

    if (recording.meeting_id) {
      const { data: meeting } = await supabase
        .from('meetings')
        .select('title, scheduled_start')
        .eq('id', recording.meeting_id)
        .single();
      
      if (meeting) {
        meetingTitle = meeting.title || meetingTitle;
        meetingDate = meeting.scheduled_start || meetingDate;
      }
    }

    // Build PDF content as structured data
    // Note: In production, use a PDF generation service like PDFKit or jsPDF via edge function
    // For now, we'll create an HTML report that can be printed to PDF
    
    const analysis = recording.ai_analysis || {};
    const candidateEval = analysis.candidateEvaluation || {};
    const transcript = recording.transcript || 'No transcript available';
    const keyMoments = analysis.keyMoments || [];
    const actionItems = analysis.actionItems || [];
    const speakingMetrics = recording.speaking_metrics || {};

    const formatDate = (dateStr: string) => {
      try {
        return new Date(dateStr).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch {
        return dateStr;
      }
    };

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${meetingTitle} - Recording Report</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Inter', sans-serif;
      background: ${COLORS.eclipse};
      color: ${COLORS.ivory};
      padding: 40px;
      line-height: 1.6;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid ${COLORS.gold};
    }
    
    .logo {
      font-size: 24px;
      font-weight: 700;
      color: ${COLORS.gold};
    }
    
    .watermark {
      font-size: 12px;
      color: ${COLORS.textSecondary};
    }
    
    h1 {
      font-size: 28px;
      margin-bottom: 8px;
      color: ${COLORS.ivory};
    }
    
    h2 {
      font-size: 20px;
      margin: 32px 0 16px;
      color: ${COLORS.gold};
      padding-bottom: 8px;
      border-bottom: 1px solid ${COLORS.gold}40;
    }
    
    h3 {
      font-size: 16px;
      margin: 16px 0 8px;
      color: ${COLORS.ivory};
    }
    
    .meta {
      color: ${COLORS.textSecondary};
      font-size: 14px;
      margin-bottom: 24px;
    }
    
    .section {
      background: ${COLORS.cardBg};
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
    }
    
    .summary-text {
      font-size: 16px;
      line-height: 1.8;
      color: ${COLORS.ivory};
    }
    
    .key-moment {
      padding: 12px 16px;
      background: ${COLORS.eclipse};
      border-left: 3px solid ${COLORS.gold};
      margin: 12px 0;
      border-radius: 0 8px 8px 0;
    }
    
    .key-moment .timestamp {
      font-size: 12px;
      color: ${COLORS.gold};
      margin-bottom: 4px;
    }
    
    .action-item {
      display: flex;
      gap: 12px;
      padding: 12px 0;
      border-bottom: 1px solid ${COLORS.cardBg};
    }
    
    .action-item:last-child { border-bottom: none; }
    
    .action-priority {
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }
    
    .priority-high { background: #ef4444; color: white; }
    .priority-medium { background: #f59e0b; color: white; }
    .priority-low { background: #22c55e; color: white; }
    
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }
    
    .metric-card {
      background: ${COLORS.eclipse};
      padding: 16px;
      border-radius: 8px;
      text-align: center;
    }
    
    .metric-value {
      font-size: 24px;
      font-weight: 700;
      color: ${COLORS.gold};
    }
    
    .metric-label {
      font-size: 12px;
      color: ${COLORS.textSecondary};
      margin-top: 4px;
    }
    
    .transcript {
      font-size: 14px;
      line-height: 1.8;
      white-space: pre-wrap;
      color: ${COLORS.textSecondary};
      max-height: 600px;
      overflow: hidden;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid ${COLORS.cardBg};
      text-align: center;
      font-size: 12px;
      color: ${COLORS.textSecondary};
    }
    
    @media print {
      body { background: white; color: black; }
      .section { border: 1px solid #ddd; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">☘️ The Quantum Club</div>
    <div class="watermark">Generated ${formatDate(new Date().toISOString())} • Confidential</div>
  </div>
  
  <h1>${meetingTitle}</h1>
  <div class="meta">
    ${formatDate(meetingDate)} • ${Math.round((recording.duration_seconds || 0) / 60)} minutes
    ${recording.participants?.length ? ` • ${recording.participants.length} participants` : ''}
  </div>
  
  ${analysis.summary ? `
  <h2>Executive Summary</h2>
  <div class="section">
    <p class="summary-text">${analysis.summary}</p>
  </div>
  ` : ''}
  
  ${candidateEval.overallFit ? `
  <h2>Candidate Evaluation</h2>
  <div class="section">
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-value">${candidateEval.overallFit || 'N/A'}</div>
        <div class="metric-label">Overall Fit</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${candidateEval.technicalScore || 'N/A'}/10</div>
        <div class="metric-label">Technical Score</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${candidateEval.culturalScore || 'N/A'}/10</div>
        <div class="metric-label">Cultural Score</div>
      </div>
    </div>
    ${candidateEval.strengths?.length ? `
    <h3>Strengths</h3>
    <ul>${candidateEval.strengths.map((s: string) => `<li>${s}</li>`).join('')}</ul>
    ` : ''}
    ${candidateEval.concerns?.length ? `
    <h3>Concerns</h3>
    <ul>${candidateEval.concerns.map((c: string) => `<li>${c}</li>`).join('')}</ul>
    ` : ''}
  </div>
  ` : ''}
  
  ${keyMoments.length > 0 ? `
  <h2>Key Moments</h2>
  <div class="section">
    ${keyMoments.map((moment: any) => `
    <div class="key-moment">
      <div class="timestamp">${moment.timestamp || ''}</div>
      <div>${moment.description || moment.text || ''}</div>
    </div>
    `).join('')}
  </div>
  ` : ''}
  
  ${actionItems.length > 0 ? `
  <h2>Action Items</h2>
  <div class="section">
    ${actionItems.map((item: any) => `
    <div class="action-item">
      <span class="action-priority priority-${item.priority || 'medium'}">${item.priority || 'Medium'}</span>
      <div>
        <strong>${item.action || item.title || ''}</strong>
        ${item.assignee ? `<br><small>Assigned to: ${item.assignee}</small>` : ''}
      </div>
    </div>
    `).join('')}
  </div>
  ` : ''}
  
  ${Object.keys(speakingMetrics).length > 0 ? `
  <h2>Speaking Metrics</h2>
  <div class="section">
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-value">${speakingMetrics.totalSpeakingTime ? Math.round(speakingMetrics.totalSpeakingTime / 60) : 0}m</div>
        <div class="metric-label">Total Speaking Time</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${speakingMetrics.averageTurnLength ? Math.round(speakingMetrics.averageTurnLength) : 0}s</div>
        <div class="metric-label">Avg Turn Length</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${speakingMetrics.interruptionCount || 0}</div>
        <div class="metric-label">Interruptions</div>
      </div>
    </div>
  </div>
  ` : ''}
  
  <h2>Full Transcript</h2>
  <div class="section">
    <div class="transcript">${transcript.substring(0, 10000)}${transcript.length > 10000 ? '\n\n[Transcript truncated for PDF export]' : ''}</div>
  </div>
  
  <div class="footer">
    <p>This report was generated by The Quantum Club AI Meeting Intelligence.</p>
    <p>Confidential - Do not distribute without authorization.</p>
  </div>
</body>
</html>
    `;

    // Store the HTML report in storage for download
    const fileName = `recording-report-${recordingId}-${Date.now()}.html`;
    const { error: uploadError } = await supabase.storage
      .from('recording-exports')
      .upload(fileName, htmlContent, {
        contentType: 'text/html',
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      // Fall back to returning HTML directly if storage fails
      return new Response(htmlContent, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html',
          'Content-Disposition': `attachment; filename="${meetingTitle.replace(/[^a-z0-9]/gi, '_')}_report.html"`
        }
      });
    }

    // Generate signed URL for download
    const { data: signedUrl } = await supabase.storage
      .from('recording-exports')
      .createSignedUrl(fileName, 3600); // 1 hour expiry

    return new Response(JSON.stringify({
      success: true,
      downloadUrl: signedUrl?.signedUrl,
      fileName
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to generate PDF',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
