import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LinkedInProfile {
  fullName: string;
  email?: string;
  headline?: string;
  location?: string;
  profileUrl: string;
  imageUrl?: string;
  summary?: string;
  experience?: Array<{
    title: string;
    company: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  }>;
  education?: Array<{
    school: string;
    degree?: string;
    field?: string;
    startYear?: string;
    endYear?: string;
  }>;
  skills?: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { linkedinUrl } = await req.json();

    if (!linkedinUrl) {
      throw new Error('LinkedIn URL is required');
    }

    console.log('[linkedin-scraper] Processing LinkedIn profile:', linkedinUrl);

    // TODO: PHASE 2 - Integrate with real LinkedIn scraping service
    // Options (requires API key and paid subscription):
    // - Proxycurl (recommended): https://proxycurl.com - $49/mo for 1000 credits
    // - RapidAPI LinkedIn Scraper: https://rapidapi.com/rockapis-rockapis-default/api/linkedin-api8
    // - ScraperAPI: https://www.scraperapi.com
    // - Official LinkedIn API (requires LinkedIn partnership approval)
    //
    // To enable real scraping:
    // 1. Add PROXYCURL_API_KEY secret in Supabase settings
    // 2. Uncomment the Proxycurl integration code below
    // 3. Remove the mock data fallback

    const PROXYCURL_API_KEY = Deno.env.get('PROXYCURL_API_KEY');
    
    let profile: LinkedInProfile;
    
    if (PROXYCURL_API_KEY) {
      // Real Proxycurl integration
      console.log('[linkedin-scraper] Using Proxycurl API');
      const response = await fetch(`https://nubela.co/proxycurl/api/v2/linkedin?url=${encodeURIComponent(linkedinUrl)}`, {
        headers: {
          'Authorization': `Bearer ${PROXYCURL_API_KEY}`,
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[linkedin-scraper] Proxycurl error:', response.status, errorText);
        throw new Error(`LinkedIn scraping failed: ${response.status}`);
      }
      
      const data = await response.json();
      profile = {
        fullName: data.full_name || extractNameFromUrl(linkedinUrl),
        email: data.personal_emails?.[0] || '',
        headline: data.headline || '',
        location: data.city ? `${data.city}, ${data.country_full_name}` : '',
        profileUrl: linkedinUrl,
        imageUrl: data.profile_pic_url || '',
        summary: data.summary || '',
        experience: (data.experiences || []).map((exp: any) => ({
          title: exp.title,
          company: exp.company,
          location: exp.location,
          startDate: exp.starts_at ? `${exp.starts_at.year}-${exp.starts_at.month || 1}` : undefined,
          endDate: exp.ends_at ? `${exp.ends_at.year}-${exp.ends_at.month || 1}` : undefined,
          description: exp.description,
        })),
        education: (data.education || []).map((edu: any) => ({
          school: edu.school,
          degree: edu.degree_name,
          field: edu.field_of_study,
          startYear: edu.starts_at?.year?.toString(),
          endYear: edu.ends_at?.year?.toString(),
        })),
        skills: data.skills || [],
      };
    } else {
      // Fallback: Extract name from URL only - manual data entry required
      console.log('[linkedin-scraper] No API key configured - using URL extraction only');
      const extractedName = extractNameFromUrl(linkedinUrl);
      profile = {
        fullName: extractedName,
        email: '',
        headline: '',
        location: '',
        profileUrl: linkedinUrl,
        imageUrl: '',
        summary: '',
        experience: [],
        education: [],
        skills: []
      };
    }

    // Calculate years of experience from work history
    const yearsOfExperience = calculateYearsOfExperience(profile.experience || []);
    
    // Extract current position from most recent experience
    const currentPosition = profile.experience?.[0];
    
    // Transform to our candidate profile format
    const candidateData = {
      full_name: profile.fullName,
      email: profile.email || '',
      linkedin_url: profile.profileUrl,
      avatar_url: profile.imageUrl || '',
      current_title: currentPosition?.title || '',
      current_company: currentPosition?.company || '',
      years_of_experience: yearsOfExperience,
      skills: profile.skills || [],
      education: profile.education || [],
      work_history: profile.experience || [],
      source_channel: 'linkedin',
      source_metadata: {
        scraped_at: new Date().toISOString(),
        profile_url: linkedinUrl,
        api_used: PROXYCURL_API_KEY ? 'proxycurl' : 'url_extraction',
        note: PROXYCURL_API_KEY ? 'Imported from LinkedIn via Proxycurl' : 'Imported from LinkedIn - verify details manually'
      },
      linkedin_profile_data: profile,
      ai_summary: generateAiSummary(profile)
    };

    return new Response(
      JSON.stringify({
        success: true,
        data: candidateData,
        message: 'Profile data extracted successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in linkedin-scraper:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function extractNameFromUrl(url: string): string {
  const match = url.match(/linkedin\.com\/in\/([^\/\?]+)/);
  if (match && match[1]) {
    // Remove trailing numeric IDs (like /192381298) and any path segments
    let namePart = match[1].replace(/\/\d+$/, '').split('/')[0];
    
    // Remove trailing alphanumeric IDs - LinkedIn uses various patterns:
    // -13963a15b, -a1b2c3d4, etc. (8+ alphanumeric chars after last dash)
    namePart = namePart.replace(/-[a-z0-9]{6,}$/i, '');
    
    // Also remove any segment that's primarily numbers after splitting
    const parts = namePart.split('-').filter(word => {
      // Keep if it's not mostly numbers (e.g., keep "pfeiffer" but not "13963a15b")
      const digitCount = (word.match(/\d/g) || []).length;
      return digitCount < word.length / 2; // Less than half digits = keep it
    });
    
    // Convert kebab-case to Title Case
    return parts
      .filter(word => word.length > 0)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  return 'LinkedIn User';
}

function calculateYearsOfExperience(experience: any[]): number {
  if (!experience || experience.length === 0) return 0;

  const totalMonths = experience.reduce((total, exp) => {
    const start = exp.startDate ? new Date(exp.startDate) : new Date();
    const end = exp.endDate ? new Date(exp.endDate) : new Date();
    const months = (end.getFullYear() - start.getFullYear()) * 12 + 
                   (end.getMonth() - start.getMonth());
    return total + Math.max(0, months);
  }, 0);

  return Math.round((totalMonths / 12) * 10) / 10;
}

function generateAiSummary(profile: LinkedInProfile): string {
  const parts: string[] = ['📎 LinkedIn Profile Imported'];
  
  if (profile.headline) {
    parts.push(`\n**Headline:** ${profile.headline}`);
  }
  
  if (profile.location) {
    parts.push(`**Location:** ${profile.location}`);
  }
  
  if (profile.skills && profile.skills.length > 0) {
    parts.push(`\n**Skills:** ${profile.skills.join(', ')}`);
  }
  
  if (profile.experience && profile.experience.length > 0) {
    parts.push(`\n**Recent Experience:**`);
    profile.experience.slice(0, 3).forEach(exp => {
      parts.push(`• ${exp.title} at ${exp.company}${exp.startDate ? ` (${exp.startDate}${exp.endDate ? ` - ${exp.endDate}` : ' - Present'})` : ''}`);
    });
  }
  
  if (profile.education && profile.education.length > 0) {
    parts.push(`\n**Education:**`);
    profile.education.slice(0, 2).forEach(edu => {
      parts.push(`• ${edu.degree || 'Degree'} ${edu.field ? `in ${edu.field}` : ''} - ${edu.school}`);
    });
  }
  
  parts.push(`\n⚠️ **Action Required:** Manually verify Current Title and Current Company from their LinkedIn profile.`);
  
  return parts.join('\n');
}