import { createAuthenticatedHandler } from '../_shared/handler.ts';

function extractUsername(url: string): string | null {
  const match = url.match(/linkedin\.com\/in\/([^/?#]+)/i);
  return match ? match[1] : null;
}

Deno.serve(createAuthenticatedHandler(async (req, ctx) => {
  console.log('[sync-avatar-linkedin] Authenticated user:', ctx.user.id);

  const { accountId, linkedinUrl } = await req.json();
  if (!accountId || !linkedinUrl) {
    return new Response(JSON.stringify({ error: 'accountId and linkedinUrl required' }), {
      status: 400, headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log('[sync-avatar-linkedin] Syncing account:', accountId, 'URL:', linkedinUrl);

  const APIFY_API_KEY = Deno.env.get('APIFY_API_KEY');

  let profilePicUrl: string | null = null;
  let connections: number | null = null;
  let followers: number | null = null;
  let headline: string | null = null;
  let fullName: string | null = null;
  // Extended fields
  let about: string | null = null;
  let location: string | null = null;
  let topSkills: string[] | null = null;
  let currentCompany: string | null = null;
  let currentCompanyUrl: string | null = null;
  let isCreator = false;
  let isInfluencer = false;
  let isPremium = false;
  let openToWork = false;
  let publicIdentifier: string | null = null;
  let linkedinUrn: string | null = null;
  let accountCreatedAt: string | null = null;
  let backgroundPicUrl: string | null = null;
  let experienceJson: unknown = null;
  let educationJson: unknown = null;
  let featuredJson: unknown = null;
  let linkedinEmailFromScrape: string | null = null;

  // Helper: find a value across many field name aliases, including nested objects
  function findField(obj: unknown, aliases: string[]): unknown {
    if (!obj || typeof obj !== 'object') return null;
    const record = obj as Record<string, unknown>;
    for (const key of aliases) {
      const val = record[key];
      if (val !== undefined && val !== null && val !== '') return val;
    }
    for (const container of ['basic_info', 'profile', 'data', 'result', 'person', 'details']) {
      if (record[container] && typeof record[container] === 'object') {
        const found = findField(record[container], aliases);
        if (found) return found;
      }
    }
    return null;
  }

  function parseNum(val: unknown): number | null {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const n = parseInt(val.replace(/[^0-9]/g, ''), 10);
      return isNaN(n) ? null : n;
    }
    return null;
  }

  const PIC_ALIASES = [
    'profile_pic_url', 'profile_picture_url', 'profilePicture', 'avatar', 'imageUrl',
    'profilePictureUrl', 'profile_picture', 'profilePhoto', 'photo',
    'picture', 'image', 'img', 'profileImage', 'profile_image_url',
    'displayPictureUrl', 'pictureUrl', 'photo_url', 'profilePictureOriginal',
    'profile_pic', 'profilePic',
  ];
  const CONN_ALIASES = [
    'connections', 'connections_count', 'numConnections', 'connectionCount',
    'total_connections', 'connectionsCount', 'numberOfConnections', 'connection_count',
  ];
  const FOLLOW_ALIASES = [
    'follower_count', 'followers', 'followersCount', 'numFollowers',
    'total_followers', 'numberOfFollowers', 'followers_count', 'followerCount',
  ];

  // Try Apify first
  if (APIFY_API_KEY) {
    const username = extractUsername(linkedinUrl);
    if (username) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000);

        const response = await fetch(
          `https://api.apify.com/v2/acts/apimaestro~linkedin-profile-detail/run-sync-get-dataset-items?token=${APIFY_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username }),
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);

        if (response.ok) {
          const items = await response.json();
          const raw = items?.[0] || {};

          // Log raw response for debugging field names
          console.log('[sync-avatar-linkedin] Raw Apify response keys:', JSON.stringify(Object.keys(raw)));
          if (raw.basic_info) console.log('[sync-avatar-linkedin] basic_info keys:', JSON.stringify(Object.keys(raw.basic_info)));

          const data = { ...raw.basic_info, ...raw };

          fullName = data.fullname || data.fullName || data.full_name || data.name || null;
          headline = data.headline || data.occupation || data.tagline || null;
          profilePicUrl = findField(raw, PIC_ALIASES);
          connections = parseNum(findField(raw, CONN_ALIASES));
          followers = parseNum(findField(raw, FOLLOW_ALIASES));

          // Extended data extraction
          about = data.about || data.summary || data.bio || null;
          location = data.location || data.city || data.region || null;
          if (typeof location === 'object' && location !== null) {
            const loc = location as Record<string, string>;
            const city = (loc.city || '').trim();
            const country = (loc.country || '').trim();
            location = (city && country) ? `${city}, ${country}` : (loc.full || city || country || loc.region || null);
          }
          topSkills = data.top_skills || data.skills || data.topSkills || null;
          if (topSkills && !Array.isArray(topSkills)) topSkills = null;
          currentCompany = data.current_company || data.currentCompany || data.company || null;
          currentCompanyUrl = data.current_company_url || data.currentCompanyUrl || null;
          isCreator = !!(data.is_creator || data.isCreator);
          isInfluencer = !!(data.is_influencer || data.isInfluencer);
          isPremium = !!(data.is_premium || data.isPremium || data.premium);
          openToWork = !!(data.open_to_work || data.openToWork);
          publicIdentifier = data.public_identifier || data.publicIdentifier || null;
          linkedinUrn = data.urn || data.linkedin_urn || null;
          accountCreatedAt = data.created_timestamp || data.createdAt || null;
          backgroundPicUrl = findField(raw, ['background_picture_url', 'backgroundPicture', 'coverPicture', 'background_cover_image_url']);
          experienceJson = data.experience || raw.experience || null;
          educationJson = data.education || raw.education || null;
          featuredJson = data.featured || raw.featured || null;
          linkedinEmailFromScrape = data.email || null;

          console.log('[sync-avatar-linkedin] Apify success:', fullName, '| pic:', !!profilePicUrl, '| conn:', connections, '| follow:', followers, '| skills:', topSkills?.length ?? 0, '| company:', currentCompany);
        }
      } catch (e: unknown) {
        console.warn('[sync-avatar-linkedin] Apify failed:', e instanceof Error ? e.message : e);
      }
    }
  }

  // Secondary Apify actor fallback for missing avatar
  if (!profilePicUrl && APIFY_API_KEY && fullName) {
    const username2 = extractUsername(linkedinUrl);
    if (username2) {
      try {
        console.log('[sync-avatar-linkedin] Trying secondary Apify actor for avatar:', username2);
        const controller2 = new AbortController();
        const timeoutId2 = setTimeout(() => controller2.abort(), 30000);

        const resp2 = await fetch(
          `https://api.apify.com/v2/acts/curious_coder~linkedin-profile-scraper/run-sync-get-dataset-items?token=${APIFY_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ profileUrls: [linkedinUrl] }),
            signal: controller2.signal,
          }
        );

        clearTimeout(timeoutId2);

        if (resp2.ok) {
          const items2 = await resp2.json();
          const raw2 = items2?.[0] || {};
          profilePicUrl = findField(raw2, PIC_ALIASES);
          console.log('[sync-avatar-linkedin] Secondary Apify actor avatar result:', !!profilePicUrl);
        }
      } catch (e: unknown) {
        console.warn('[sync-avatar-linkedin] Secondary Apify actor failed:', e instanceof Error ? e.message : e);
      }
    }
  }

  if (!fullName && !headline && !profilePicUrl) {
    return new Response(JSON.stringify({ error: 'Could not fetch LinkedIn profile data' }), {
      status: 422, headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Store avatar image if available
  let storedAvatarUrl = profilePicUrl;
  if (profilePicUrl) {
    try {
      console.log('[sync-avatar-linkedin] Downloading profile image:', profilePicUrl.substring(0, 80));
      const imgResp = await fetch(profilePicUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (imgResp.ok) {
        const contentType = imgResp.headers.get('content-type') || 'image/jpeg';
        const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
        const buf = await imgResp.arrayBuffer();
        console.log('[sync-avatar-linkedin] Image downloaded:', buf.byteLength, 'bytes');
        if (buf.byteLength > 100) {
          const filePath = `linkedin-avatars/${accountId}.${ext}`;
          await ctx.supabase.storage.from('avatars').upload(filePath, buf, { contentType, upsert: true });
          const { data: urlData } = ctx.supabase.storage.from('avatars').getPublicUrl(filePath);
          storedAvatarUrl = urlData?.publicUrl || profilePicUrl;
          console.log('[sync-avatar-linkedin] Image stored at:', storedAvatarUrl);
        } else {
          console.warn('[sync-avatar-linkedin] Image too small:', buf.byteLength, 'bytes');
        }
      } else {
        console.warn('[sync-avatar-linkedin] Image download failed:', imgResp.status);
      }
    } catch (imgErr: unknown) {
      console.warn('[sync-avatar-linkedin] Image upload error:', imgErr instanceof Error ? imgErr.message : imgErr);
    }
  }

  // Update account with all extracted data — never overwrite avatar_url with null
  const updates: Record<string, unknown> = {
    linkedin_url: linkedinUrl,
    connections_count: connections,
    followers_count: followers,
    linkedin_headline: headline,
    last_synced_at: new Date().toISOString(),
    // Extended fields
    about,
    location,
    top_skills: topSkills,
    current_company: currentCompany,
    current_company_url: currentCompanyUrl,
    is_creator: isCreator,
    is_influencer: isInfluencer,
    is_premium: isPremium,
    open_to_work: openToWork,
    public_identifier: publicIdentifier,
    linkedin_urn: linkedinUrn,
    account_created_at: accountCreatedAt,
    background_picture_url: backgroundPicUrl,
    experience_json: experienceJson,
    education_json: educationJson,
    featured_json: featuredJson,
    linkedin_email_from_scrape: linkedinEmailFromScrape,
  };

  // Only update avatar_url if we actually got a new image — never wipe existing
  if (storedAvatarUrl) {
    updates.avatar_url = storedAvatarUrl;
  } else {
    console.log('[sync-avatar-linkedin] No new avatar found — keeping existing avatar_url');
  }

  const { data: updated, error: updateError } = await ctx.supabase
    .from('linkedin_avatar_accounts')
    .update(updates)
    .eq('id', accountId)
    .select()
    .single();

  if (updateError) throw updateError;

  return new Response(JSON.stringify({ success: true, data: updated, fullName }), {
    headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' },
  });
}));
