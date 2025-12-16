import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { listBlockList, addToBlockList, BlockListEntry } from "../_shared/instantly-client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action } = await req.json();
    console.log(`[sync-instantly-blocklist] Action: ${action}`);

    if (action === 'pull') {
      const result = await pullFromInstantly(supabase);
      return new Response(JSON.stringify({ success: true, ...result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else if (action === 'push') {
      const result = await pushToInstantly(supabase);
      return new Response(JSON.stringify({ success: true, ...result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else if (action === 'sync') {
      const pullResult = await pullFromInstantly(supabase);
      const pushResult = await pushToInstantly(supabase);
      
      return new Response(JSON.stringify({
        success: true,
        pull: pullResult,
        push: pushResult,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[sync-instantly-blocklist] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function pullFromInstantly(supabase: any): Promise<{ imported: number; total: number }> {
  console.log('[sync-instantly-blocklist] Pulling from Instantly...');
  
  let allEntries: BlockListEntry[] = [];
  let skip = 0;
  const limit = 100;
  
  // Paginate through all Instantly block list entries
  while (true) {
    const response = await listBlockList({ limit, skip });
    
    if (response.error) {
      console.error('[sync-instantly-blocklist] Instantly API error:', response.error);
      throw new Error(`Instantly API error: ${response.error}`);
    }
    
    if (!response.data || response.data.length === 0) break;
    
    allEntries = [...allEntries, ...response.data];
    console.log(`[sync-instantly-blocklist] Fetched ${allEntries.length} entries so far...`);
    
    if (response.data.length < limit) break;
    skip += limit;
  }
  
  console.log(`[sync-instantly-blocklist] Total Instantly entries: ${allEntries.length}`);
  
  // Get existing entries from our suppression list
  const { data: existingEntries } = await supabase
    .from('crm_suppression_list')
    .select('email, domain, instantly_entry_id');
  
  const existingEmails = new Set((existingEntries || []).map((e: any) => e.email?.toLowerCase()).filter(Boolean));
  const existingDomains = new Set((existingEntries || []).map((e: any) => e.domain?.toLowerCase()).filter(Boolean));
  const existingInstantlyIds = new Set((existingEntries || []).map((e: any) => e.instantly_entry_id).filter(Boolean));
  
  // Filter new entries to import
  const newEntries = allEntries.filter(entry => {
    if (existingInstantlyIds.has(entry.id)) return false;
    
    const value = entry.bl_value.toLowerCase();
    // is_domain: true = domain, false = email (API V2 format)
    if (!entry.is_domain && existingEmails.has(value)) return false;
    if (entry.is_domain && existingDomains.has(value)) return false;
    
    return true;
  });
  
  console.log(`[sync-instantly-blocklist] New entries to import: ${newEntries.length}`);
  
  if (newEntries.length === 0) {
    return { imported: 0, total: allEntries.length };
  }
  
  // Insert new entries (is_domain: true = domain, false = email)
  const insertData = newEntries.map(entry => ({
    email: !entry.is_domain ? entry.bl_value.toLowerCase() : null,
    domain: entry.is_domain ? entry.bl_value.toLowerCase() : null,
    source: 'instantly_blocklist',
    reason: 'Imported from Instantly block list',
    instantly_entry_id: entry.id,
    sync_status: 'synced',
    last_synced_at: new Date().toISOString(),
  }));
  
  const { error: insertError } = await supabase
    .from('crm_suppression_list')
    .insert(insertData);
  
  if (insertError) {
    console.error('[sync-instantly-blocklist] Insert error:', insertError);
    throw insertError;
  }
  
  console.log(`[sync-instantly-blocklist] Imported ${newEntries.length} entries`);
  
  return { imported: newEntries.length, total: allEntries.length };
}

async function pushToInstantly(supabase: any): Promise<{ pushed: number }> {
  console.log('[sync-instantly-blocklist] Pushing to Instantly...');
  
  // Get local entries that haven't been synced to Instantly
  const { data: unsyncedEntries, error } = await supabase
    .from('crm_suppression_list')
    .select('id, email, domain')
    .is('instantly_entry_id', null)
    .or('sync_status.eq.pending,sync_status.is.null');
  
  if (error) throw error;
  
  if (!unsyncedEntries || unsyncedEntries.length === 0) {
    console.log('[sync-instantly-blocklist] No entries to push');
    return { pushed: 0 };
  }
  
  console.log(`[sync-instantly-blocklist] Entries to push: ${unsyncedEntries.length}`);
  
  // Prepare entries for Instantly (is_domain: true = domain, false = email)
  const entriesToPush = unsyncedEntries.map((entry: any) => ({
    bl_value: entry.email || entry.domain,
    is_domain: !entry.email, // if no email, it's a domain
  }));
  
  // Push to Instantly in batches of 100
  let pushed = 0;
  for (let i = 0; i < entriesToPush.length; i += 100) {
    const batch = entriesToPush.slice(i, i + 100);
    const response = await addToBlockList(batch);
    
    if (response.error) {
      console.error('[sync-instantly-blocklist] Push error:', response.error);
      continue;
    }
    
    // Update local entries with Instantly IDs
    if (response.data) {
      for (const instantlyEntry of response.data) {
        const localEntry = unsyncedEntries.find((e: any) => 
          (e.email && e.email.toLowerCase() === instantlyEntry.bl_value.toLowerCase()) ||
          (e.domain && e.domain.toLowerCase() === instantlyEntry.bl_value.toLowerCase())
        );
        
        if (localEntry) {
          await supabase
            .from('crm_suppression_list')
            .update({
              instantly_entry_id: instantlyEntry.id,
              sync_status: 'synced',
              last_synced_at: new Date().toISOString(),
            })
            .eq('id', localEntry.id);
        }
      }
    }
    
    pushed += batch.length;
  }
  
  console.log(`[sync-instantly-blocklist] Pushed ${pushed} entries`);
  
  return { pushed };
}
