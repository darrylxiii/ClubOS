import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('LinkedIn scraper: No authorization header');
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

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

    const proxycurlKey = Deno.env.get('PROXYCURL_API_KEY');
    
    if (!proxycurlKey) {
      console.log('PROXYCURL_API_KEY not configured, using basic scraper');
      throw new Error('Proxycurl API key not configured');
    }

    const response = await fetch(
      `https://nubela.co/proxycurl/api/v2/linkedin?url=${encodeURIComponent(linkedinUrl)}`,
      {
        headers: {
          'Authorization': `Bearer ${proxycurlKey}`
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to scrape LinkedIn profile');
    }

    const data = await response.json();

    const candidateData = {
      full_name: `${data.first_name} ${data.last_name}`,
      email: '',
      linkedin_url: linkedinUrl,
      avatar_url: data.profile_pic_url,
      current_title: data.occupation || data.experiences?.[0]?.title,
      current_company: data.experiences?.[0]?.company,
      years_of_experience: calculateExperience(data.experiences),
      skills: data.skills || [],
      work_history: data.experiences?.map((exp: any) => ({
        title: exp.title,
        company: exp.company,
        location: exp.location,
        start_date: exp.starts_at ? `${exp.starts_at.year}-${exp.starts_at.month || 1}-01` : null,
        end_date: exp.ends_at ? `${exp.ends_at.year}-${exp.ends_at.month || 12}-01` : null,
        description: exp.description
      })) || [],
      education: data.education?.map((edu: any) => ({
        institution: edu.school,
        degree: edu.degree_name,
        field: edu.field_of_study,
        start_date: edu.starts_at?.year,
        end_date: edu.ends_at?.year
      })) || [],
      certifications: data.certifications?.map((cert: any) => ({
        name: cert.name,
        issuer: cert.authority,
        issue_date: cert.starts_at ? `${cert.starts_at.year}-${cert.starts_at.month}` : null
      })) || [],
      linkedin_profile_data: data,
      source_channel: 'linkedin',
      source_metadata: {
        scraped_at: new Date().toISOString(),
        profile_url: linkedinUrl,
        scraper: 'proxycurl'
      },
      enrichment_last_run: new Date().toISOString()
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
    if (exp.starts_at && exp.starts_at.year) {
      const startDate = new Date(exp.starts_at.year, exp.starts_at.month || 1);
      const endDate = exp.ends_at 
        ? new Date(exp.ends_at.year, exp.ends_at.month || 12)
        : new Date();
      
      const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                     (endDate.getMonth() - startDate.getMonth());
      totalMonths += Math.max(0, months);
    }
  });
  
  return Math.round((totalMonths / 12) * 10) / 10;
}
