import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { publicCorsHeaders as corsHeaders } from '../_shared/cors-config.ts';

interface InstantlyProspect {
  email: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  company_domain?: string;
  title?: string;
  phone?: string;
  linkedin_url?: string;
  location?: string;
  industry?: string;
  company_size?: string;
  // Engagement fields from Instantly export
  status?: string;
  sent_count?: number;
  open_count?: number;
  click_count?: number;
  reply_count?: number;
  bounced?: boolean;
  unsubscribed?: boolean;
  last_step?: number;
  // Custom fields
  [key: string]: any;
}

interface ImportRequest {
  campaign_name: string;
  campaign_id?: string; // Existing campaign to add to
  external_campaign_id?: string; // Instantly campaign ID
  prospects: InstantlyProspect[];
  field_mapping?: Record<string, string>; // Map CSV columns to our fields
  owner_id?: string;
  company_id?: string;
  skip_duplicates?: boolean;
  update_existing?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const input: ImportRequest = await req.json();

    if (!input.prospects || !Array.isArray(input.prospects) || input.prospects.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No prospects to import' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create import log
    const { data: importLog, error: logError } = await supabase
      .from('crm_import_logs')
      .insert({
        import_type: 'instantly_campaign',
        total_rows: input.prospects.length,
        status: 'processing',
        field_mapping: input.field_mapping || {},
        imported_by: user.id,
        company_id: input.company_id,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (logError) {
      console.error('Failed to create import log:', logError);
    }

    // Get or create campaign
    let campaignId = input.campaign_id;
    if (!campaignId && input.campaign_name) {
      const { data: campaign, error: campaignError } = await supabase
        .from('crm_campaigns')
        .insert({
          name: input.campaign_name,
          source: 'instantly',
          external_id: input.external_campaign_id,
          status: 'active',
          owner_id: input.owner_id || user.id,
          company_id: input.company_id,
        })
        .select()
        .single();

      if (campaignError) {
        console.error('Failed to create campaign:', campaignError);
        return new Response(
          JSON.stringify({ error: 'Failed to create campaign', details: campaignError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      campaignId = campaign.id;
    }

    // Get suppression list
    const { data: suppressedEmails } = await supabase
      .from('crm_suppression_list')
      .select('email, domain')
      .or('expires_at.is.null,expires_at.gt.now()');

    const suppressedSet = new Set(suppressedEmails?.map(s => s.email.toLowerCase()) || []);
    const suppressedDomains = new Set(suppressedEmails?.filter(s => s.domain).map(s => s.domain!.toLowerCase()) || []);

    // Process prospects
    let imported = 0;
    let skipped = 0;
    let failed = 0;
    let duplicates = 0;
    const errors: { row: number; email: string; error: string }[] = [];

    for (let i = 0; i < input.prospects.length; i++) {
      const prospect = input.prospects[i];
      
      try {
        // Validate email
        if (!prospect.email || !prospect.email.includes('@')) {
          errors.push({ row: i + 1, email: prospect.email || 'missing', error: 'Invalid email' });
          failed++;
          continue;
        }

        const email = prospect.email.toLowerCase().trim();
        const domain = email.split('@')[1];

        // Check suppression list
        if (suppressedSet.has(email) || suppressedDomains.has(domain)) {
          errors.push({ row: i + 1, email, error: 'Email is on suppression list' });
          skipped++;
          continue;
        }

        // Check for existing prospect
        const { data: existing } = await supabase
          .from('crm_prospects')
          .select('id')
          .eq('email', email)
          .maybeSingle();

        if (existing) {
          if (input.skip_duplicates) {
            duplicates++;
            continue;
          }
          if (input.update_existing) {
            // Update existing prospect
            const { error: updateError } = await supabase
              .from('crm_prospects')
              .update({
                first_name: prospect.first_name || undefined,
                last_name: prospect.last_name || undefined,
                company_name: prospect.company_name || undefined,
                job_title: prospect.title || undefined,
                phone: prospect.phone || undefined,
                linkedin_url: prospect.linkedin_url || undefined,
                emails_sent: prospect.sent_count || 0,
                emails_opened: prospect.open_count || 0,
                emails_replied: prospect.reply_count || 0,
                stage: prospect.bounced ? 'closed_lost' : 
                       prospect.unsubscribed ? 'unsubscribed' :
                       prospect.reply_count && prospect.reply_count > 0 ? 'replied' :
                       prospect.open_count && prospect.open_count > 0 ? 'opened' :
                       prospect.sent_count && prospect.sent_count > 0 ? 'contacted' : 'new',
                email_status: prospect.bounced ? 'bounced' : 'valid',
                updated_at: new Date().toISOString(),
              })
              .eq('id', existing.id);

            if (updateError) {
              errors.push({ row: i + 1, email, error: updateError.message });
              failed++;
            } else {
              imported++;
            }
            continue;
          }
          duplicates++;
          continue;
        }

        // Determine stage based on Instantly data
        let stage = 'new';
        if (prospect.bounced) stage = 'closed_lost';
        else if (prospect.unsubscribed) stage = 'unsubscribed';
        else if (prospect.reply_count && prospect.reply_count > 0) stage = 'replied';
        else if (prospect.open_count && prospect.open_count > 0) stage = 'opened';
        else if (prospect.sent_count && prospect.sent_count > 0) stage = 'contacted';

        // Create full name
        const fullName = [prospect.first_name, prospect.last_name]
          .filter(Boolean)
          .join(' ') || email.split('@')[0];

        // Insert new prospect
        const { error: insertError } = await supabase
          .from('crm_prospects')
          .insert({
            email,
            first_name: prospect.first_name,
            last_name: prospect.last_name,
            full_name: fullName,
            company_name: prospect.company_name,
            company_domain: prospect.company_domain || domain,
            job_title: prospect.title,
            phone: prospect.phone,
            linkedin_url: prospect.linkedin_url,
            location: prospect.location,
            industry: prospect.industry,
            company_size: prospect.company_size,
            stage,
            source: 'instantly',
            campaign_id: campaignId,
            emails_sent: prospect.sent_count || 0,
            emails_opened: prospect.open_count || 0,
            emails_replied: prospect.reply_count || 0,
            email_status: prospect.bounced ? 'bounced' : 'valid',
            owner_id: input.owner_id || user.id,
            custom_fields: Object.fromEntries(
              Object.entries(prospect)
                .filter(([key]) => !['email', 'first_name', 'last_name', 'company_name', 'company_domain', 'title', 'phone', 'linkedin_url', 'location', 'industry', 'company_size', 'status', 'sent_count', 'open_count', 'click_count', 'reply_count', 'bounced', 'unsubscribed', 'last_step'].includes(key))
            ),
          });

        if (insertError) {
          errors.push({ row: i + 1, email, error: insertError.message });
          failed++;
        } else {
          imported++;
        }

      } catch (err) {
        errors.push({ row: i + 1, email: prospect.email || 'unknown', error: String(err) });
        failed++;
      }
    }

    // Update import log
    if (importLog) {
      await supabase
        .from('crm_import_logs')
        .update({
          imported_rows: imported,
          skipped_rows: skipped,
          failed_rows: failed,
          duplicate_rows: duplicates,
          status: failed > 0 && imported === 0 ? 'failed' : 'completed',
          errors: errors.slice(0, 100), // Store first 100 errors
          campaign_id: campaignId,
          completed_at: new Date().toISOString(),
        })
        .eq('id', importLog.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        campaign_id: campaignId,
        import_log_id: importLog?.id,
        stats: {
          total: input.prospects.length,
          imported,
          skipped,
          failed,
          duplicates,
        },
        errors: errors.slice(0, 20), // Return first 20 errors
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in import-instantly-campaign:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
