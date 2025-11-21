import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { authenticateUser, requireRole, createAuthErrorResponse } from '../_shared/auth-helpers.ts';
import { getCorsHeaders, handleCorsPreFlight } from '../_shared/cors-config.ts';
import { logAuditEvent } from '../_shared/security-logger.ts';

interface IntegrityIssue {
  user_id: string;
  auth_email: string;
  profile_email: string;
  auth_full_name: string;
  profile_full_name: string;
  mismatch_type: string;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req, true); // Sensitive operation
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleCorsPreFlight(corsHeaders);
  }

  try {
    // Phase 3: Server-side role verification - Only admins can check data integrity
    const authContext = await authenticateUser(req.headers.get('authorization'));
    requireRole(authContext, ['admin']);
    
    console.log(`[Integrity Check] Initiated by admin: ${authContext.email}`);
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

    // Log audit event
    await logAuditEvent({
      eventType: 'data_access',
      action: 'read',
      resourceType: 'system',
      resourceName: 'data_integrity_check',
      userId: authContext.userId,
      userEmail: authContext.email,
      userRole: 'admin',
      metadata: { issues_found: issuesFound },
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown'
    });
    
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
    
    // Handle authentication errors
    if (errorMessage.includes('authorization') || errorMessage.includes('Unauthorized')) {
      return createAuthErrorResponse(errorMessage, 401, corsHeaders);
    }
    
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
