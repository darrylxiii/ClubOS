import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IntegrityIssue {
  user_id: string;
  auth_email: string;
  profile_email: string;
  auth_full_name: string;
  profile_full_name: string;
  mismatch_type: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check for data integrity issues
    const { data: mismatches, error } = await supabase
      .rpc('check_profile_auth_integrity') as { data: IntegrityIssue[] | null; error: any };

    if (error) {
      console.error('Error checking integrity:', error);
      throw error;
    }

    const issuesFound = mismatches?.length || 0;

    // Log results
    console.log(`Data integrity check completed: ${issuesFound} issue(s) found`);
    
    if (issuesFound > 0) {
      console.warn('Data integrity issues detected:', JSON.stringify(mismatches, null, 2));
      
      // Optionally: Auto-fix if enabled via query param
      const url = new URL(req.url);
      const autoFix = url.searchParams.get('autofix') === 'true';
      
      if (autoFix) {
        console.log('Auto-fix enabled, attempting to fix mismatches...');
        const { data: fixResults, error: fixError } = await supabase
          .rpc('fix_profile_auth_mismatches');
        
        if (fixError) {
          console.error('Error auto-fixing:', fixError);
        } else {
          console.log(`Auto-fixed ${fixResults?.length || 0} profile(s)`);
          return new Response(
            JSON.stringify({ 
              status: 'fixed',
              issues_found: issuesFound,
              issues_fixed: fixResults?.length || 0,
              mismatches,
              fix_results: fixResults
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200
            }
          );
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        status: issuesFound > 0 ? 'issues_detected' : 'ok',
        issues_found: issuesFound,
        mismatches: mismatches || [],
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('Function error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        status: 'error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
