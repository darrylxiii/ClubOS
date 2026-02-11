import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

async function downloadAndStoreAvatar(
  imageUrl: string,
  linkedinUrl: string,
): Promise<string | null> {
  try {
    const response = await fetch(imageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const ext = contentType.includes('png') ? 'png'
              : contentType.includes('webp') ? 'webp' : 'jpg';

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength < 1000) return null; // Skip placeholder images

    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(linkedinUrl));
    const hashHex = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .substring(0, 12);
    const filePath = `linkedin/${hashHex}.${ext}`;

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const storageClient = createClient(supabaseUrl, supabaseServiceKey);

    const { error } = await storageClient.storage
      .from('avatars')
      .upload(filePath, arrayBuffer, { contentType, upsert: true });

    if (error) {
      console.warn('[linkedin-scraper] Avatar upload failed:', error.message);
      return null;
    }

    const { data: urlData } = storageClient.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return urlData?.publicUrl || null;
  } catch (err) {
    console.warn('[linkedin-scraper] Avatar download failed:', err);
    return null;
  }
}

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
  certifications?: Array<{
    name?: string;
    issuer?: string;
    issueDate?: string;
  }>;
  languages?: string[];
  posts?: Array<{
    text?: string;
    date?: string;
    likes?: number;
    comments?: number;
    shares?: number;
    url?: string;
  }>;
}

function emptyToNull(val: unknown): string | null {
  if (val === undefined || val === null) return null;
  if (typeof val === 'string' && val.trim() === '') return null;
  return String(val);
}

function extractUsernameFromUrl(url: string): string | null {
  const match = url.match(/linkedin\.com\/in\/([^\/\?#]+)/);
  return match ? match[1] : null;
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
    
    let profile: LinkedInProfile | null = null;
    let apiUsed = 'url_extraction';
    
    // === PRIMARY: apimaestro/linkedin-profile-detail ===
    if (APIFY_API_KEY) {
      const username = extractUsernameFromUrl(linkedinUrl);
      
      if (username) {
        console.log('[linkedin-scraper] Trying apimaestro/linkedin-profile-detail for username:', username);
        apiUsed = 'apify_apimaestro';
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000);
        
        try {
          const response = await fetch(
            `https://api.apify.com/v2/acts/apimaestro~linkedin-profile-detail/run-sync-get-dataset-items?token=${APIFY_API_KEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal,
              body: JSON.stringify({
                username: username,
              })
            }
          );
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('[linkedin-scraper] apimaestro error:', response.status, errorText);
            throw new Error(`apimaestro scraping failed: ${response.status}`);
          }
          
          const results = await response.json();
          const data = Array.isArray(results) ? (results[0] || {}) : (results || {});
          
          console.log('[linkedin-scraper] apimaestro raw response keys:', Object.keys(data));
          console.log('[linkedin-scraper] apimaestro response sample:', JSON.stringify(data).substring(0, 500));
          
          const fullName = data.fullName || data.full_name || data.name || 
            (data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : null) ||
            extractNameFromUrl(linkedinUrl);
          
          // Map experience from various possible field structures
          const rawExp = data.experience || data.experiences || data.positions || data.workExperience || [];
          const rawEdu = data.education || data.educations || [];
          const rawSkills = data.skills || [];
          const rawCerts = data.certifications || data.certificates || [];
          const rawLangs = data.languages || [];
          
          profile = {
            fullName,
            email: data.email || data.personal_email || '',
            headline: data.headline || data.title || data.occupation || data.tagline || '',
            location: data.location || data.addressLocality || data.city || data.geo || '',
            profileUrl: linkedinUrl,
            imageUrl: data.profilePicture || data.profilePictureUrl || data.image || data.avatar || data.profile_pic_url || data.profileImage || '',
            summary: data.summary || data.about || data.description || '',
            experience: rawExp.map((exp: any) => ({
              title: exp.title || exp.role || exp.position || '',
              company: exp.company || exp.companyName || exp.organization || exp.companyTitle || '',
              location: exp.location || exp.locationName || '',
              startDate: exp.startDate || exp.start_date || exp.dateRange?.start ||
                (exp.starts_at ? `${exp.starts_at.year}-${String(exp.starts_at.month || 1).padStart(2, '0')}` : undefined) ||
                (exp.start?.year ? `${exp.start.year}-${String(exp.start.month || 1).padStart(2, '0')}` : undefined) ||
                (exp.timePeriod?.startDate ? `${exp.timePeriod.startDate.year}-${String(exp.timePeriod.startDate.month || 1).padStart(2, '0')}` : undefined),
              endDate: exp.endDate || exp.end_date || exp.dateRange?.end ||
                (exp.ends_at ? `${exp.ends_at.year}-${String(exp.ends_at.month || 1).padStart(2, '0')}` : undefined) ||
                (exp.end?.year ? `${exp.end.year}-${String(exp.end.month || 1).padStart(2, '0')}` : undefined) ||
                (exp.timePeriod?.endDate ? `${exp.timePeriod.endDate.year}-${String(exp.timePeriod.endDate.month || 1).padStart(2, '0')}` : undefined),
              description: exp.description || exp.summary || '',
            })),
            education: rawEdu.map((edu: any) => ({
              school: edu.school || edu.schoolName || edu.institution || edu.university || edu.schoolId || '',
              degree: edu.degree || edu.degreeName || edu.degree_name || '',
              field: edu.field || edu.fieldOfStudy || edu.field_of_study || edu.major || '',
              startYear: (edu.startYear || edu.start_year || edu.starts_at?.year || edu.start?.year || edu.timePeriod?.startDate?.year)?.toString(),
              endYear: (edu.endYear || edu.end_year || edu.ends_at?.year || edu.end?.year || edu.timePeriod?.endDate?.year)?.toString(),
            })),
            skills: rawSkills.map((s: any) => typeof s === 'string' ? s : (s.name || s.skill || '')).filter(Boolean),
            certifications: rawCerts.map((c: any) => ({
              name: typeof c === 'string' ? c : (c.name || c.title || ''),
              issuer: c.authority || c.issuer || c.issuingOrganization || '',
              issueDate: c.issueDate || c.startDate || '',
            })),
            languages: rawLangs.map((l: any) => typeof l === 'string' ? l : (l.name || l.language || '')).filter(Boolean),
            posts: [],
          };
          
          console.log('[linkedin-scraper] apimaestro succeeded:', profile.fullName, 
            '| experience:', profile.experience?.length, 
            '| education:', profile.education?.length, 
            '| skills:', profile.skills?.length,
            '| certs:', profile.certifications?.length);
        } catch (err: any) {
          clearTimeout(timeoutId);
          if (err.name === 'AbortError') {
            console.warn('[linkedin-scraper] apimaestro timed out after 45s, falling back');
          } else {
            console.error('[linkedin-scraper] apimaestro failed:', err.message);
          }
          profile = null;
        }
      } else {
        console.warn('[linkedin-scraper] Could not extract username from URL:', linkedinUrl);
      }
    }
    
    // === SECONDARY: Proxycurl ===
    if (!profile && PROXYCURL_API_KEY) {
      console.log('[linkedin-scraper] Trying Proxycurl API with 15s timeout');
      apiUsed = 'proxycurl';
      
      const proxycurlController = new AbortController();
      const proxycurlTimeoutId = setTimeout(() => proxycurlController.abort(), 15000);
      
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
            startDate: exp.starts_at ? `${exp.starts_at.year}-${String(exp.starts_at.month || 1).padStart(2, '0')}` : undefined,
            endDate: exp.ends_at ? `${exp.ends_at.year}-${String(exp.ends_at.month || 1).padStart(2, '0')}` : undefined,
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
          certifications: (data.certifications || []).map((c: any) => ({
            name: c.name,
            issuer: c.authority,
            issueDate: c.starts_at ? `${c.starts_at.year}` : '',
          })),
          languages: (data.languages || []).map((l: any) => l),
          posts: data.activities || [],
        };
        
        console.log('[linkedin-scraper] Proxycurl succeeded:', profile.fullName);
      } catch (proxycurlError: any) {
        clearTimeout(proxycurlTimeoutId);
        
        if (proxycurlError.name === 'AbortError') {
          console.warn('[linkedin-scraper] Proxycurl timed out after 15s');
        } else {
          console.error('[linkedin-scraper] Proxycurl failed:', proxycurlError.message);
        }
      }
    }
    
    // === FALLBACK: URL extraction only ===
    if (!profile) {
      console.log('[linkedin-scraper] All providers failed — using URL extraction only');
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
        certifications: [],
        languages: [],
        posts: [],
      };
    }

    const yearsOfExperience = calculateYearsOfExperience(profile.experience || []);
    const currentPosition = profile.experience?.[0];
    
    // Normalize work_history to DB/UI expected field names
    const normalizedWorkHistory = (profile.experience || []).map(exp => ({
      title: emptyToNull(exp.title),
      position: emptyToNull(exp.title),
      company: emptyToNull(exp.company),
      location: emptyToNull(exp.location),
      start_date: emptyToNull(exp.startDate),
      end_date: emptyToNull(exp.endDate),
      description: emptyToNull(exp.description),
    })).filter(e => e.title || e.company); // Drop entries with no title AND no company

    const normalizedEducation = (profile.education || []).map(edu => ({
      institution: emptyToNull(edu.school),
      school: emptyToNull(edu.school),
      degree: emptyToNull(edu.degree),
      field_of_study: emptyToNull(edu.field),
      start_year: emptyToNull(edu.startYear),
      end_year: emptyToNull(edu.endYear),
    })).filter(e => e.institution || e.degree);

    const normalizedCertifications = (profile.certifications || []).map(c => ({
      name: emptyToNull(typeof c === 'string' ? c : c.name) || 'Certification',
      issuer: emptyToNull(typeof c === 'string' ? null : c.issuer),
      issue_date: emptyToNull(typeof c === 'string' ? null : c.issueDate),
    }));

    const normalizedPosts = (profile.posts || []).map((post: any) => ({
      text: post.text || post.postContent || post.content || null,
      date: post.date || post.postedDate || post.publishedDate || null,
      likes: post.likes || post.numLikes || post.socialCounts?.numLikes || 0,
      comments: post.comments || post.numComments || post.socialCounts?.numComments || 0,
      shares: post.shares || post.numShares || post.socialCounts?.numShares || 0,
      url: post.url || post.postUrl || null,
    }));

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
      certifications: normalizedCertifications,
      languages: profile.languages || [],
      source_channel: 'linkedin',
      source_metadata: {
        scraped_at: new Date().toISOString(),
        profile_url: linkedinUrl,
        api_used: apiUsed,
        note: apiUsed === 'url_extraction' 
          ? 'Imported from LinkedIn — verify details manually' 
          : `Imported from LinkedIn via ${apiUsed}`
      },
      linkedin_profile_data: linkedinProfileData,
      ai_summary: generateAiSummary(profile, normalizedPosts),
    };

    // Download and persist avatar to storage if available
    if (candidateData.avatar_url) {
      const permanentUrl = await downloadAndStoreAvatar(
        candidateData.avatar_url,
        linkedinUrl,
      );
      if (permanentUrl) {
        candidateData.avatar_url = permanentUrl;
        console.log('[linkedin-scraper] Avatar persisted to storage:', permanentUrl);
      }
    }

    console.log('[linkedin-scraper] Final output — work_history:', normalizedWorkHistory.length, '| education:', normalizedEducation.length, '| skills:', candidateData.skills.length, '| api:', apiUsed);

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
      parts.push(`• ${exp.title} at ${exp.company}${exp.startDate ? ` (${exp.startDate}${exp.endDate ? ` – ${exp.endDate}` : ' – Present'})` : ''}`);
    });
  }
  
  if (profile.education && profile.education.length > 0) {
    parts.push(`\n**Education:**`);
    profile.education.slice(0, 2).forEach(edu => {
      parts.push(`• ${edu.degree || 'Degree'} ${edu.field ? `in ${edu.field}` : ''} – ${edu.school}`);
    });
  }

  if (posts && posts.length > 0) {
    const postsWithText = posts.filter(p => p.text);
    const totalEngagement = posts.reduce((sum, p) => sum + (p.likes || 0) + (p.comments || 0), 0);
    parts.push(`\n**LinkedIn Activity:** ${postsWithText.length} recent posts, ${totalEngagement} total engagements`);
  }
  
  parts.push(`\n⚠️ **Action Required:** Verify Current Title and Current Company from their LinkedIn profile.`);
  
  return parts.join('\n');
}
