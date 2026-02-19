import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function extractUsernameFromUrl(url: string): string | null {
  const match = url.match(/linkedin\.com\/in\/([^\/\?#]+)/);
  return match ? match[1] : null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    // In-code JWT validation
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('LinkedIn scraper: No authorization header');
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    
    if (authError || !user) {
      console.error('LinkedIn scraper: Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('LinkedIn scraper: Authenticated user:', user.id);

    const { linkedinUrl } = await req.json();

    if (!linkedinUrl) {
      throw new Error('LinkedIn URL is required');
    }

    const apifyKey = Deno.env.get('APIFY_API_KEY');
    
    if (!apifyKey) {
      console.log('APIFY_API_KEY not configured');
      throw new Error('Apify API key not configured');
    }

    const username = extractUsernameFromUrl(linkedinUrl);
    if (!username) {
      throw new Error('Could not extract LinkedIn username from URL');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    const response = await fetch(
      `https://api.apify.com/v2/acts/apimaestro~linkedin-profile-detail/run-sync-get-dataset-items?token=${apifyKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ username }),
      }
    );
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to scrape LinkedIn profile: ${response.status} ${errText}`);
    }

    const results = await response.json();
    const rawData = Array.isArray(results) ? (results[0] || {}) : (results || {});
    const basicInfo = rawData.basic_info || {};
    const data = { ...basicInfo, ...rawData };

    const rawExp = data.experience || data.experiences || data.positions || [];
    const rawEdu = data.education || data.educations || [];
    const rawSkills = data.skills || [];
    const rawCerts = data.certifications || data.certificates || [];

    const candidateData = {
      full_name: data.fullname || data.fullName || data.full_name || data.name ||
        (data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : username),
      email: '',
      linkedin_url: linkedinUrl,
      avatar_url: data.profile_picture_url || data.profilePicture || data.profilePictureUrl || data.profile_pic_url || null,
      current_title: data.headline || data.title || data.occupation || rawExp[0]?.title || null,
      current_company: rawExp[0]?.company || rawExp[0]?.companyName || rawExp[0]?.organization || null,
      years_of_experience: calculateExperience(rawExp),
      skills: rawSkills.map((s: any) => typeof s === 'string' ? s : (s.name || s.skill || '')).filter(Boolean),
      work_history: rawExp.map((exp: any) => ({
        title: exp.title || exp.role || exp.position || '',
        company: exp.company || exp.companyName || exp.organization || '',
        location: exp.location || exp.locationName || '',
        start_date: exp.startDate || exp.start_date || null,
        end_date: exp.endDate || exp.end_date || null,
        description: exp.description || exp.summary || '',
      })),
      education: rawEdu.map((edu: any) => ({
        institution: edu.school || edu.schoolName || edu.institution || '',
        degree: edu.degree || edu.degreeName || edu.degree_name || '',
        field: edu.field || edu.fieldOfStudy || edu.field_of_study || '',
        start_date: edu.startYear || edu.start_year || (edu.starts_at?.year) || null,
        end_date: edu.endYear || edu.end_year || (edu.ends_at?.year) || null,
      })),
      certifications: rawCerts.map((cert: any) => ({
        name: typeof cert === 'string' ? cert : (cert.name || cert.title || ''),
        issuer: cert.authority || cert.issuer || cert.issuingOrganization || '',
        issue_date: cert.issueDate || cert.startDate || null,
      })),
      linkedin_profile_data: rawData,
      source_channel: 'linkedin',
      source_metadata: {
        scraped_at: new Date().toISOString(),
        profile_url: linkedinUrl,
        scraper: 'apify',
      },
      enrichment_last_run: new Date().toISOString(),
    };

    return new Response(JSON.stringify({ 
      success: true, 
      candidateData 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function calculateExperience(experiences: any[]): number {
  if (!experiences?.length) return 0;
  
  let totalMonths = 0;
  experiences.forEach(exp => {
    const startVal = exp.startDate || exp.start_date || exp.starts_at;
    const endVal = exp.endDate || exp.end_date || exp.ends_at;
    
    if (startVal) {
      let startDate: Date;
      if (typeof startVal === 'object' && startVal.year) {
        startDate = new Date(startVal.year, (startVal.month || 1) - 1);
      } else {
        startDate = new Date(startVal);
      }
      
      let endDate: Date;
      if (!endVal || endVal === 'Present') {
        endDate = new Date();
      } else if (typeof endVal === 'object' && endVal.year) {
        endDate = new Date(endVal.year, (endVal.month || 12) - 1);
      } else {
        endDate = new Date(endVal);
      }
      
      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                       (endDate.getMonth() - startDate.getMonth());
        totalMonths += Math.max(0, months);
      }
    }
  });
  
  return Math.round((totalMonths / 12) * 10) / 10;
}
