import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-application-name, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const GH_BASE = 'https://harvest.greenhouse.io/v2';

interface SyncRequest {
  job_ids?: number[];
  dry_run?: boolean;
  include_rejected?: boolean;
  page_size?: number;
  mode?: 'list_jobs' | 'sync';
}

interface SyncResult {
  found: number;
  created: number;
  skipped: number;
  errors: number;
  errorDetails: string[];
  dryRun: boolean;
}

// ── Greenhouse OAuth helpers ──────────────────────────────────────
let cachedToken: string | null = null;

async function getAccessToken(clientId: string, clientSecret: string): Promise<string> {
  if (cachedToken) return cachedToken;

  const res = await fetch('https://id.greenhouse.io/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }).toString(),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Greenhouse OAuth token exchange failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  return cachedToken!;
}

function bearerHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function ghFetch(path: string, token: string): Promise<Response> {
  const res = await fetch(`${GH_BASE}${path}`, { headers: bearerHeaders(token) });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Greenhouse API ${res.status}: ${body}`);
  }
  return res;
}

/** Parse Link header for pagination */
function getNextUrl(linkHeader: string | null): string | null {
  if (!linkHeader) return null;
  const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
  return match ? match[1] : null;
}

async function fetchAllPages<T>(initialUrl: string, token: string, pageSize: number): Promise<T[]> {
  const all: T[] = [];
  let url: string | null = `${GH_BASE}${initialUrl}${initialUrl.includes('?') ? '&' : '?'}per_page=${pageSize}`;

  while (url) {
    const res = await fetch(url, { headers: bearerHeaders(token) });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Greenhouse API ${res.status}: ${body}`);
    }
    const data: T[] = await res.json();
    all.push(...data);
    url = getNextUrl(res.headers.get('Link'));

    if (url) await new Promise((r) => setTimeout(r, 200));
  }
  return all;
}

// ── Main handler ─────────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth ─────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const ghClientId = Deno.env.get('GREENHOUSE_CLIENT_ID');
    const ghClientSecret = Deno.env.get('GREENHOUSE_CLIENT_SECRET');
    if (!ghClientId || !ghClientSecret) {
      return new Response(JSON.stringify({ error: 'GREENHOUSE_CLIENT_ID and GREENHOUSE_CLIENT_SECRET not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get OAuth access token
    const ghToken = await getAccessToken(ghClientId, ghClientSecret);

    // Verify JWT + role
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check admin/strategist role
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'strategist'].includes(profile.role)) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions. Admin or Strategist role required.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: SyncRequest = await req.json();
    const { job_ids = [], dry_run = false, include_rejected = false, page_size = 100, mode = 'sync' } = body;
    const clampedPageSize = Math.min(Math.max(page_size, 1), 500);

    // ── Mode: list_jobs ──
    if (mode === 'list_jobs') {
      const jobs = await fetchAllPages<any>('/jobs?status=open', ghToken, 100);
      const closedJobs = await fetchAllPages<any>('/jobs?status=closed', ghToken, 100);
      const allJobs = [...jobs, ...closedJobs].map((j: any) => ({
        id: j.id,
        name: j.name,
        status: j.status,
        departments: j.departments?.map((d: any) => d.name) || [],
        offices: j.offices?.map((o: any) => o.name) || [],
        opened_at: j.opened_at,
        closed_at: j.closed_at,
      }));
      return new Response(JSON.stringify({ jobs: allJobs }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Mode: sync ──
    const result: SyncResult = { found: 0, created: 0, skipped: 0, errors: 0, errorDetails: [], dryRun: dry_run };

    let logId: string | null = null;
    if (!dry_run) {
      const { data: logRow } = await adminClient
        .from('greenhouse_import_logs')
        .insert({
          admin_id: user.id,
          job_ids: job_ids.length ? job_ids : null,
          total_candidates: 0,
          imported_count: 0,
          skipped_count: 0,
          failed_count: 0,
          started_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      logId = logRow?.id || null;
    }

    let ghJobIds: number[] = job_ids;
    if (!ghJobIds.length) {
      const allJobs = await fetchAllPages<any>('/jobs', ghToken, 100);
      ghJobIds = allJobs.map((j: any) => j.id);
    }

    const { data: existingProfiles } = await adminClient
      .from('candidate_profiles')
      .select('greenhouse_id')
      .not('greenhouse_id', 'is', null);
    const existingGhIds = new Set((existingProfiles || []).map((p: any) => String(p.greenhouse_id)));

    for (const jobId of ghJobIds) {
      try {
        const candidates = await fetchAllPages<any>(
          `/jobs/${jobId}/candidates`,
          ghToken,
          clampedPageSize,
        );

        for (const candidate of candidates) {
          result.found++;

          const apps = candidate.applications || [];
          const isRejected = apps.every((a: any) => a.status === 'rejected');
          if (isRejected && !include_rejected) {
            result.skipped++;
            continue;
          }

          const ghId = String(candidate.id);
          if (existingGhIds.has(ghId)) {
            result.skipped++;
            continue;
          }

          if (dry_run) {
            result.created++;
            existingGhIds.add(ghId);
            continue;
          }

          try {
            const fullName = [candidate.first_name, candidate.last_name].filter(Boolean).join(' ');
            const email = candidate.emails?.[0]?.value || candidate.email_addresses?.[0]?.value || null;
            const phone = candidate.phone_numbers?.[0]?.value || null;
            const linkedinUrl = (candidate.website_addresses || []).find(
              (w: any) => w.type === 'personal' || (w.value && w.value.includes('linkedin'))
            )?.value || null;
            const githubUrl = (candidate.website_addresses || []).find(
              (w: any) => w.value && w.value.includes('github')
            )?.value || null;
            const resumeAttachment = (candidate.attachments || []).find(
              (a: any) => a.type === 'resume'
            );
            const currentStage = apps[0]?.current_stage?.name || null;
            const tags = (candidate.tags || []).map((t: string) => t);

            const { data: newProfile, error: insertErr } = await adminClient
              .from('candidate_profiles')
              .insert({
                full_name: fullName || 'Unknown',
                email,
                phone,
                linkedin_url: linkedinUrl,
                github_url: githubUrl,
                resume_url: resumeAttachment?.url || null,
                resume_filename: resumeAttachment?.filename || null,
                greenhouse_id: ghId,
                source_channel: 'greenhouse',
                tags,
                gdpr_consent: false,
                application_status: currentStage || 'imported',
                source_metadata: {
                  greenhouse_candidate_id: candidate.id,
                  greenhouse_job_id: jobId,
                  imported_at: new Date().toISOString(),
                  applications: apps.map((a: any) => ({
                    id: a.id,
                    status: a.status,
                    stage: a.current_stage?.name,
                    applied_at: a.applied_at,
                  })),
                },
              })
              .select('id')
              .single();

            if (insertErr) {
              result.errors++;
              result.errorDetails.push(`Insert failed for GH#${ghId}: ${insertErr.message}`);
              continue;
            }

            if (newProfile) {
              await adminClient.from('candidate_notes').insert({
                candidate_id: newProfile.id,
                note_type: 'system',
                title: 'Greenhouse Import',
                content: `Imported from Greenhouse job #${jobId}. Stage: ${currentStage || 'N/A'}`,
                tags: ['greenhouse-import'],
                visibility: 'internal',
                created_by: user.id,
                metadata: {
                  greenhouse_candidate_id: candidate.id,
                  greenhouse_job_id: jobId,
                  raw_applications: apps,
                },
              });
            }

            result.created++;
            existingGhIds.add(ghId);
          } catch (candidateErr) {
            result.errors++;
            result.errorDetails.push(`Error processing GH#${ghId}: ${String(candidateErr)}`);
          }
        }
      } catch (jobErr) {
        result.errors++;
        result.errorDetails.push(`Error fetching job ${jobId}: ${String(jobErr)}`);
      }
    }

    if (logId && !dry_run) {
      await adminClient
        .from('greenhouse_import_logs')
        .update({
          total_candidates: result.found,
          imported_count: result.created,
          skipped_count: result.skipped,
          failed_count: result.errors,
          errors: result.errorDetails.length ? result.errorDetails : null,
          completed_at: new Date().toISOString(),
        })
        .eq('id', logId);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('sync-greenhouse-candidates error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
