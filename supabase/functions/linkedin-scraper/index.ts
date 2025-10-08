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

    console.log('Scraping LinkedIn profile:', linkedinUrl);

    // For demo/MVP: Return mock enriched data
    // In production, integrate with LinkedIn API or scraping service like:
    // - RapidAPI LinkedIn Profile Scraper
    // - Proxycurl
    // - ScraperAPI
    // - Or official LinkedIn API (requires partnership)

    const mockProfile: LinkedInProfile = {
      fullName: extractNameFromUrl(linkedinUrl),
      email: '', // Would be enriched via email finding service
      headline: 'Senior Software Engineer',
      location: 'Amsterdam, Netherlands',
      profileUrl: linkedinUrl,
      imageUrl: '',
      summary: 'Experienced software engineer with 8+ years in full-stack development. Specialized in React, TypeScript, and cloud infrastructure.',
      experience: [
        {
          title: 'Senior Software Engineer',
          company: 'Tech Company',
          location: 'Amsterdam',
          startDate: '2020-01',
          description: 'Leading development of enterprise SaaS platform'
        },
        {
          title: 'Software Engineer',
          company: 'Startup Inc',
          location: 'Amsterdam',
          startDate: '2016-06',
          endDate: '2020-01',
          description: 'Full-stack development and architecture'
        }
      ],
      education: [
        {
          school: 'University of Technology',
          degree: 'Master of Science',
          field: 'Computer Science',
          startYear: '2012',
          endYear: '2016'
        }
      ],
      skills: [
        'JavaScript',
        'TypeScript',
        'React',
        'Node.js',
        'PostgreSQL',
        'AWS',
        'Docker',
        'CI/CD'
      ]
    };

    // Calculate years of experience
    const yearsOfExperience = calculateYearsOfExperience(mockProfile.experience || []);

    // Transform to our candidate profile format
    const candidateData = {
      full_name: mockProfile.fullName,
      email: mockProfile.email || '',
      linkedin_url: mockProfile.profileUrl,
      avatar_url: mockProfile.imageUrl,
      current_title: mockProfile.headline,
      current_company: mockProfile.experience?.[0]?.company,
      years_of_experience: yearsOfExperience,
      skills: mockProfile.skills || [],
      education: mockProfile.education || [],
      work_history: mockProfile.experience || [],
      source_channel: 'linkedin',
      source_metadata: {
        scraped_at: new Date().toISOString(),
        profile_url: linkedinUrl,
        location: mockProfile.location
      },
      linkedin_profile_data: mockProfile,
      ai_summary: generateAiSummary(mockProfile)
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
    return match[1]
      .split('-')
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
  const yearsExp = calculateYearsOfExperience(profile.experience || []);
  const skillCount = profile.skills?.length || 0;
  const currentRole = profile.experience?.[0]?.title || 'Professional';

  return `${currentRole} with ${yearsExp} years of experience. Skilled in ${skillCount}+ technologies including ${profile.skills?.slice(0, 3).join(', ')}. Currently at ${profile.experience?.[0]?.company || 'a leading company'}.`;
}