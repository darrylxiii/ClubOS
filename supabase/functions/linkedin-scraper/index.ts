import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { resilientFetch } from '../_shared/resilient-fetch.ts';

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

import { createHandler } from '../_shared/handler.ts';

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
    companyLogo?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  }>;
  education?: Array<{
    school: string;
    schoolLogo?: string;
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

const MONTH_NAME_MAP: Record<string, string> = {
  jan:'01', feb:'02', mar:'03', apr:'04', may:'05', jun:'06',
  jul:'07', aug:'08', sep:'09', oct:'10', nov:'11', dec:'12',
};

function parseMonthValue(month: unknown): string {
  if (typeof month === 'number') return String(month).padStart(2, '0');
  if (typeof month === 'string') {
    const num = MONTH_NAME_MAP[month.toLowerCase().substring(0, 3)];
    if (num) return num;
    // Try parsing as numeric string
    const parsed = parseInt(month, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 12) return String(parsed).padStart(2, '0');
  }
  return '01';
}

function parseDateValue(val: unknown): string | undefined {
  if (!val) return undefined;
  if (typeof val === 'string') {
    if (val.trim() === '' || val === '[object Object]' || val === 'undefined' || val === 'null') return undefined;
    return val;
  }
  if (typeof val === 'number') return `${val}`;
  if (typeof val === 'object' && val !== null) {
    const obj = val as Record<string, unknown>;
    const year = obj.year;
    if (!year) return undefined;
    return `${year}-${parseMonthValue(obj.month)}`;
  }
  return undefined;
}

function normalizeDateField(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === 'string') {
    if (val.trim() === '' || val === '[object Object]' || val === 'undefined' || val === 'null') return null;
    if (/^\d{4}$/.test(val)) return `${val}-01-01`;
    if (/^\d{4}-\d{1,2}$/.test(val)) return `${val}-01`;
    return val;
  }
  if (typeof val === 'number') return `${val}-01-01`;
  if (typeof val === 'object' && val !== null) {
    const obj = val as Record<string, unknown>;
    if (obj.year) {
      return `${obj.year}-${parseMonthValue(obj.month)}-01`;
    }
  }
  return null;
}

function extractUsernameFromUrl(url: string): string | null {
  const match = url.match(/linkedin\.com\/in\/([^\/\?#]+)/);
  return match ? match[1] : null;
}

Deno.serve(createHandler(async (req, ctx) => {
  const { corsHeaders } = ctx;

  try {
    const { linkedinUrl } = await req.json();

    if (!linkedinUrl) {
      throw new Error('LinkedIn URL is required');
    }

    console.log('[linkedin-scraper] Processing LinkedIn profile:', linkedinUrl);

    const APIFY_API_KEY = Deno.env.get('APIFY_API_KEY');
    
    let profile: LinkedInProfile | null = null;
    let apiUsed = 'url_extraction';
    
    // === PRIMARY: apimaestro/linkedin-profile-detail ===
    if (APIFY_API_KEY) {
      const username = extractUsernameFromUrl(linkedinUrl);
      
      if (username) {
        console.log('[linkedin-scraper] Trying apimaestro/linkedin-profile-detail for username:', username);
        apiUsed = 'apify_apimaestro';

        try {
          const { response } = await resilientFetch(
            `https://api.apify.com/v2/acts/apimaestro~linkedin-profile-detail/run-sync-get-dataset-items?token=${APIFY_API_KEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                username: username,
              })
            },
            {
              timeoutMs: 45_000,
              maxRetries: 1,
              retryNonIdempotent: true,
              service: 'apify',
              operation: 'linkedin-profile-detail',
            }
          );

          if (!response.ok) {
            const errorText = await response.text();
            console.error('[linkedin-scraper] apimaestro error:', response.status, errorText);
            throw new Error(`apimaestro scraping failed: ${response.status}`);
          }
          
          const results = await response.json();
          const rawData = Array.isArray(results) ? (results[0] || {}) : (results || {});
          
          // Flatten basic_info into top-level for unified field access
          // apimaestro nests profile_picture_url, fullname, headline, about under basic_info
          const basicInfo = rawData.basic_info || {};
          const data = { ...basicInfo, ...rawData };
          
          console.log('[linkedin-scraper] apimaestro raw response keys:', Object.keys(rawData));
          console.log('[linkedin-scraper] apimaestro basic_info keys:', Object.keys(basicInfo));
          console.log('[linkedin-scraper] apimaestro response sample:', JSON.stringify(rawData).substring(0, 500));
          
          const fullName = data.fullname || data.fullName || data.full_name || data.name || 
            (data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : null) ||
            (data.first_name && data.last_name ? `${data.first_name} ${data.last_name}` : null) ||
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
            imageUrl: data.profile_picture_url || data.profilePicture || data.profilePictureUrl || data.image || data.avatar || data.profile_pic_url || data.profileImage || data.profilePictureOriginal || data.profilePictures?.[0] || data.img || '',
            summary: data.about || data.summary || data.description || '',
            experience: rawExp.map((exp: Record<string, unknown>) => ({
              title: exp.title || exp.role || exp.position || '',
              company: exp.company || exp.companyName || exp.organization || exp.companyTitle || '',
              companyLogo: exp.companyLogo || exp.companyLogoUrl || exp.logo || exp.company_logo_url || exp.logoUrl || exp.logo_url || '',
              location: exp.location || exp.locationName || '',
              startDate: parseDateValue(exp.startDate) || parseDateValue(exp.start_date) || parseDateValue(exp.dateRange?.start) ||
                parseDateValue(exp.starts_at) || parseDateValue(exp.start) || parseDateValue(exp.timePeriod?.startDate),
              endDate: parseDateValue(exp.endDate) || parseDateValue(exp.end_date) || parseDateValue(exp.dateRange?.end) ||
                parseDateValue(exp.ends_at) || parseDateValue(exp.end) || parseDateValue(exp.timePeriod?.endDate),
              description: exp.description || exp.summary || '',
            })),
            education: rawEdu.map((edu: Record<string, unknown>) => ({
              school: edu.school || edu.schoolName || edu.institution || edu.university || edu.schoolId || '',
              schoolLogo: edu.logo || edu.logoUrl || edu.schoolLogo || edu.school_logo || edu.school_logo_url || edu.schoolLogoUrl || edu.companyLogo || edu.logo_url || '',
              degree: edu.degree || edu.degreeName || edu.degree_name || '',
              field: edu.field || edu.fieldOfStudy || edu.field_of_study || edu.major || '',
              startYear: parseDateValue(edu.startYear) || parseDateValue(edu.start_year) || parseDateValue(edu.starts_at) || parseDateValue(edu.start) || parseDateValue(edu.timePeriod?.startDate),
              endYear: parseDateValue(edu.endYear) || parseDateValue(edu.end_year) || parseDateValue(edu.ends_at) || parseDateValue(edu.end) || parseDateValue(edu.timePeriod?.endDate),
            })),
            skills: rawSkills.map((s: Record<string, unknown> | string) => typeof s === 'string' ? s : ((s.name || s.skill || '') as string)).filter(Boolean),
            certifications: rawCerts.map((c: Record<string, unknown> | string) => ({
              name: typeof c === 'string' ? c : (c.name || c.title || ''),
              issuer: c.authority || c.issuer || c.issuingOrganization || '',
              issueDate: c.issueDate || c.startDate || '',
            })),
            languages: rawLangs.map((l: Record<string, unknown> | string) => typeof l === 'string' ? l : ((l.name || l.language || '') as string)).filter(Boolean),
            posts: [],
          };
          
          console.log('[linkedin-scraper] apimaestro succeeded:', profile.fullName, 
            '| imageUrl:', profile.imageUrl?.substring(0, 80),
            '| experience:', profile.experience?.length, 
            '| education:', profile.education?.length, 
            '| skills:', profile.skills?.length,
            '| certs:', profile.certifications?.length);
        } catch (err: unknown) {
          if (err instanceof Error && err.name === 'ResilientFetchTimeoutError') {
            console.warn('[linkedin-scraper] apimaestro timed out after 45s, falling back');
          } else {
            console.error('[linkedin-scraper] apimaestro failed:', err instanceof Error ? err.message : err);
          }
          profile = null;
        }
      } else {
        console.warn('[linkedin-scraper] Could not extract username from URL:', linkedinUrl);
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
      company_logo: emptyToNull(exp.companyLogo),
      location: emptyToNull(exp.location),
      start_date: normalizeDateField(exp.startDate),
      end_date: normalizeDateField(exp.endDate),
      description: emptyToNull(exp.description),
    })).filter(e => e.title || e.company);

    const normalizedEducation = (profile.education || []).map(edu => ({
      institution: emptyToNull(edu.school),
      school: emptyToNull(edu.school),
      school_logo: emptyToNull(edu.schoolLogo),
      degree: emptyToNull(edu.degree),
      field_of_study: emptyToNull(edu.field),
      start_year: normalizeDateField(edu.startYear),
      end_year: normalizeDateField(edu.endYear),
    })).filter(e => e.institution || e.degree);

    const normalizedCertifications = (profile.certifications || []).map(c => ({
      name: emptyToNull(typeof c === 'string' ? c : c.name) || 'Certification',
      issuer: emptyToNull(typeof c === 'string' ? null : c.issuer),
      issue_date: emptyToNull(typeof c === 'string' ? null : c.issueDate),
    }));

    const normalizedPosts = (profile.posts || []).map((post) => ({
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
}));

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

function calculateYearsOfExperience(experience: NonNullable<LinkedInProfile['experience']>): number {
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

function generateAiSummary(profile: LinkedInProfile, posts: Array<{ text?: string | null; likes?: number; comments?: number }> = []): string {
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
