import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-api-version, x-application-name, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, traceparent, tracestate',
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
  articles?: Array<{
    title?: string;
    link?: string;
    publishedDate?: string;
  }>;
  posts?: Array<{
    text?: string;
    date?: string;
    likes?: number;
    comments?: number;
    shares?: number;
    url?: string;
  }>;
}

// Convert empty strings to null so || fallbacks work correctly in the UI
function emptyToNull(val: unknown): string | null {
  if (typeof val === 'string' && val.trim() === '') return null;
  return val as string | null;
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

    const APIFY_API_KEY = Deno.env.get('APIFY_API_KEY');
    const PROXYCURL_API_KEY = Deno.env.get('PROXYCURL_API_KEY');
    
    const APIFY_TIMEOUT = 15000;
    const PROXYCURL_TIMEOUT = 10000;
    
    let profile: LinkedInProfile | null = null;
    let apiUsed = 'url_extraction';
    
    if (APIFY_API_KEY) {
      console.log('[linkedin-scraper] Trying Apify API with 15s timeout');
      apiUsed = 'apify';
      
      const apifyController = new AbortController();
      const apifyTimeoutId = setTimeout(() => apifyController.abort(), APIFY_TIMEOUT);
      
      try {
        const response = await fetch(
          `https://api.apify.com/v2/acts/apify~linkedin-profile-scraper/run-sync-get-dataset-items?token=${APIFY_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: apifyController.signal,
            body: JSON.stringify({
              startUrls: [{ url: linkedinUrl }],
              maxResults: 1,
              getArticles: true,
              proxy: {
                useApifyProxy: true,
                apifyProxyGroups: ['RESIDENTIAL']
              }
            })
          }
        );
        
        clearTimeout(apifyTimeoutId);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[linkedin-scraper] Apify error:', response.status, errorText);
          throw new Error(`Apify scraping failed: ${response.status}`);
        }
        
        const results = await response.json();
        const data = results?.[0] || {};
        
        profile = {
          fullName: data.fullName || data.firstName && data.lastName 
            ? `${data.firstName} ${data.lastName}` 
            : extractNameFromUrl(linkedinUrl),
          email: data.email || '',
          headline: data.headline || data.title || '',
          location: data.location || data.addressLocality || '',
          profileUrl: linkedinUrl,
          imageUrl: data.profilePicture || data.image || '',
          summary: data.summary || data.description || '',
          experience: (data.experience || data.positions || []).map((exp: any) => ({
            title: exp.title || exp.role,
            company: exp.company || exp.companyName,
            location: exp.location,
            startDate: exp.startDate || exp.start?.year ? `${exp.start?.year}-${exp.start?.month || 1}` : undefined,
            endDate: exp.endDate || exp.end?.year ? `${exp.end?.year}-${exp.end?.month || 1}` : undefined,
            description: exp.description,
          })),
          education: (data.education || []).map((edu: any) => ({
            school: edu.school || edu.schoolName,
            degree: edu.degree || edu.degreeName,
            field: edu.field || edu.fieldOfStudy,
            startYear: edu.startYear?.toString() || edu.start?.year?.toString(),
            endYear: edu.endYear?.toString() || edu.end?.year?.toString(),
          })),
          skills: data.skills?.map((s: any) => typeof s === 'string' ? s : s.name) || [],
          articles: data.articles || [],
          posts: data.posts || data.activities || [],
        };
        
        console.log('[linkedin-scraper] Apify succeeded:', profile.fullName);
      } catch (apifyError: any) {
        clearTimeout(apifyTimeoutId);
        
        if (apifyError.name === 'AbortError') {
          console.warn('[linkedin-scraper] Apify timed out after 15s, falling back to next provider');
        } else {
          console.error('[linkedin-scraper] Apify failed:', apifyError.message);
        }
        profile = null as any;
      }
    }
    
    if (!profile && PROXYCURL_API_KEY) {
      console.log('[linkedin-scraper] Trying Proxycurl API with 10s timeout');
      apiUsed = 'proxycurl';
      
      const proxycurlController = new AbortController();
      const proxycurlTimeoutId = setTimeout(() => proxycurlController.abort(), PROXYCURL_TIMEOUT);
      
      try {
        const response = await fetch(`https://nubela.co/proxycurl/api/v2/linkedin?url=${encodeURIComponent(linkedinUrl)}`, {
          headers: {
            'Authorization': `Bearer ${PROXYCURL_API_KEY}`,
          },
          signal: proxycurlController.signal,
        });
        
        clearTimeout(proxycurlTimeoutId);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[linkedin-scraper] Proxycurl error:', response.status, errorText);
          throw new Error(`Proxycurl scraping failed: ${response.status}`);
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
          articles: data.articles || [],
          posts: data.activities || [],
        };
        
        console.log('[linkedin-scraper] Proxycurl succeeded:', profile.fullName);
      } catch (proxycurlError: any) {
        clearTimeout(proxycurlTimeoutId);
        
        if (proxycurlError.name === 'AbortError') {
          console.warn('[linkedin-scraper] Proxycurl timed out after 10s, using URL extraction');
        } else {
          console.error('[linkedin-scraper] Proxycurl failed:', proxycurlError.message);
        }
      }
    }
    
    if (!profile) {
      console.log('[linkedin-scraper] No API key configured - using URL extraction only');
      apiUsed = 'url_extraction';
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
        skills: [],
        articles: [],
        posts: [],
      };
    }

    const yearsOfExperience = calculateYearsOfExperience(profile.experience || []);
    const currentPosition = profile.experience?.[0];
    
    // Normalize work_history fields to match DB/UI expectations (start_date, end_date, position)
    const normalizedWorkHistory = (profile.experience || []).map(exp => ({
      title: emptyToNull(exp.title),
      position: emptyToNull(exp.title), // alias for UI compatibility
      company: emptyToNull(exp.company),
      location: emptyToNull(exp.location),
      start_date: emptyToNull(exp.startDate), // normalized from startDate
      end_date: emptyToNull(exp.endDate),     // normalized from endDate
      description: emptyToNull(exp.description),
    }));

    // Normalize education fields (institution, field_of_study, start_year, end_year)
    const normalizedEducation = (profile.education || []).map(edu => ({
      institution: emptyToNull(edu.school),    // normalized from school
      school: emptyToNull(edu.school),         // kept for backward compat
      degree: emptyToNull(edu.degree),
      field_of_study: emptyToNull(edu.field),  // normalized from field
      start_year: emptyToNull(edu.startYear),  // normalized from startYear
      end_year: emptyToNull(edu.endYear),      // normalized from endYear
    }));

    // Normalize posts data
    const normalizedPosts = (profile.posts || []).map((post: any) => ({
      text: post.text || post.postContent || post.content || null,
      date: post.date || post.postedDate || post.publishedDate || null,
      likes: post.likes || post.numLikes || post.socialCounts?.numLikes || 0,
      comments: post.comments || post.numComments || post.socialCounts?.numComments || 0,
      shares: post.shares || post.numShares || post.socialCounts?.numShares || 0,
      url: post.url || post.postUrl || null,
    }));

    // Build linkedin_profile_data with posts included
    const linkedinProfileData = {
      ...profile,
      posts: normalizedPosts,
      posts_scraped_at: normalizedPosts.length > 0 ? new Date().toISOString() : null,
    };

    const candidateData = {
      full_name: emptyToNull(profile.fullName),
      email: emptyToNull(profile.email),
      linkedin_url: profile.profileUrl,
      avatar_url: emptyToNull(profile.imageUrl),
      current_title: emptyToNull(currentPosition?.title),
      current_company: emptyToNull(currentPosition?.company),
      location: emptyToNull(profile.location),
      years_of_experience: yearsOfExperience,
      skills: (profile.skills || []).filter(s => s && s.trim() !== ''),
      education: normalizedEducation,
      work_history: normalizedWorkHistory,
      source_channel: 'linkedin',
      source_metadata: {
        scraped_at: new Date().toISOString(),
        profile_url: linkedinUrl,
        api_used: apiUsed,
        note: apiUsed === 'url_extraction' 
          ? 'Imported from LinkedIn - verify details manually' 
          : `Imported from LinkedIn via ${apiUsed}`
      },
      linkedin_profile_data: linkedinProfileData,
      ai_summary: generateAiSummary(profile, normalizedPosts),
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
    let namePart = match[1].replace(/\/\d+$/, '').split('/')[0];
    namePart = namePart.replace(/-[a-z0-9]{6,}$/i, '');
    const parts = namePart.split('-').filter(word => {
      const digitCount = (word.match(/\d/g) || []).length;
      return digitCount < word.length / 2;
    });
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

function generateAiSummary(profile: LinkedInProfile, posts: any[] = []): string {
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

  // Posts summary
  if (posts && posts.length > 0) {
    const postsWithText = posts.filter(p => p.text);
    const totalEngagement = posts.reduce((sum, p) => sum + (p.likes || 0) + (p.comments || 0), 0);
    parts.push(`\n**LinkedIn Activity:** ${postsWithText.length} recent posts, ${totalEngagement} total engagements`);
    
    // Show top 2 post previews
    postsWithText.slice(0, 2).forEach(post => {
      const preview = post.text.substring(0, 100) + (post.text.length > 100 ? '...' : '');
      parts.push(`• "${preview}" (${post.likes || 0} likes)`);
    });
  }
  
  parts.push(`\n⚠️ **Action Required:** Manually verify Current Title and Current Company from their LinkedIn profile.`);
  
  return parts.join('\n');
}
