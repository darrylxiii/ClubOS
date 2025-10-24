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

    // For demo/MVP: Return basic extracted data only
    // In production, integrate with LinkedIn API or scraping service like:
    // - RapidAPI LinkedIn Profile Scraper
    // - Proxycurl
    // - ScraperAPI
    // - Or official LinkedIn API (requires partnership)

    const extractedName = extractNameFromUrl(linkedinUrl);
    
    // Return minimal mock data - user should manually fill in the rest
    const mockProfile: LinkedInProfile = {
      fullName: extractedName,
      email: '', // To be filled manually
      headline: '', // To be filled manually - check LinkedIn profile
      location: '',
      profileUrl: linkedinUrl,
      imageUrl: '',
      summary: '',
      experience: [],
      education: [],
      skills: []
    };

    // Transform to our candidate profile format with rich data for admin notes
    const candidateData = {
      full_name: mockProfile.fullName,
      email: '',
      linkedin_url: mockProfile.profileUrl,
      avatar_url: '',
      current_title: '', // Leave empty - must be filled manually from LinkedIn
      current_company: '', // Leave empty - must be filled manually from LinkedIn
      years_of_experience: 0,
      skills: mockProfile.skills || [],
      education: mockProfile.education || [],
      work_history: mockProfile.experience || [],
      source_channel: 'linkedin',
      source_metadata: {
        scraped_at: new Date().toISOString(),
        profile_url: linkedinUrl,
        note: 'Imported from LinkedIn - verify details'
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
  const skillCount = profile.skills?.length || 0;
  
  return `Profile imported from LinkedIn.

Skills: ${profile.skills?.join(', ') || 'Not available - check LinkedIn profile'}

Experience: Check LinkedIn profile for detailed work history.

IMPORTANT: Manually verify Current Company and Current Title from their LinkedIn profile.`;
}