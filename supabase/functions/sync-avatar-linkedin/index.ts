import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function extractUsername(url: string): string | null {
  const match = url.match(/linkedin\.com\/in\/([^/?#]+)/i);
  return match ? match[1] : null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { accountId, linkedinUrl } = await req.json();
    if (!accountId || !linkedinUrl) {
      return new Response(JSON.stringify({ error: 'accountId and linkedinUrl required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log('[sync-avatar-linkedin] Syncing account:', accountId, 'URL:', linkedinUrl);

    const APIFY_API_KEY = Deno.env.get('APIFY_API_KEY');
    const PROXYCURL_API_KEY = Deno.env.get('PROXYCURL_API_KEY');

    let profilePicUrl: string | null = null;
    let connections: number | null = null;
    let followers: number | null = null;
    let headline: string | null = null;
    let fullName: string | null = null;

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
            const data = { ...raw.basic_info, ...raw };

            fullName = data.fullname || data.fullName || data.full_name || data.name || null;
            headline = data.headline || data.occupation || data.tagline || null;
            profilePicUrl = data.profile_pic_url || data.profilePicture || data.avatar || data.imageUrl || null;
            connections = typeof data.connections === 'number' ? data.connections :
              typeof data.connections_count === 'number' ? data.connections_count :
              (typeof data.connections === 'string' ? parseInt(data.connections.replace(/[^0-9]/g, ''), 10) || null : null);
            followers = typeof data.follower_count === 'number' ? data.follower_count :
              typeof data.followers === 'number' ? data.followers :
              (typeof data.follower_count === 'string' ? parseInt(data.follower_count.replace(/[^0-9]/g, ''), 10) || null : null);

            console.log('[sync-avatar-linkedin] Apify success:', fullName);
          }
        } catch (e) {
          console.warn('[sync-avatar-linkedin] Apify failed:', e.message);
        }
      }
    }

    // Fallback to Proxycurl
    if (!fullName && PROXYCURL_API_KEY) {
      try {
        const response = await fetch(
          `https://nubela.co/proxycurl/api/v2/linkedin?url=${encodeURIComponent(linkedinUrl)}`,
          { headers: { 'Authorization': `Bearer ${PROXYCURL_API_KEY}` } }
        );
        if (response.ok) {
          const data = await response.json();
          fullName = [data.first_name, data.last_name].filter(Boolean).join(' ') || null;
          headline = data.headline || data.occupation || null;
          profilePicUrl = data.profile_pic_url || null;
          connections = data.connections ?? null;
          followers = data.follower_count ?? null;
          console.log('[sync-avatar-linkedin] Proxycurl success:', fullName);
        }
      } catch (e) {
        console.warn('[sync-avatar-linkedin] Proxycurl failed:', e.message);
      }
    }

    if (!fullName && !headline && !profilePicUrl) {
      return new Response(JSON.stringify({ error: 'Could not fetch LinkedIn profile data' }), { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Store avatar image if available
    let storedAvatarUrl = profilePicUrl;
    if (profilePicUrl) {
      try {
        const imgResp = await fetch(profilePicUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (imgResp.ok) {
          const contentType = imgResp.headers.get('content-type') || 'image/jpeg';
          const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
          const buf = await imgResp.arrayBuffer();
          if (buf.byteLength > 1000) {
            const filePath = `linkedin-avatars/${accountId}.${ext}`;
            await supabase.storage.from('avatars').upload(filePath, buf, { contentType, upsert: true });
            const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
            storedAvatarUrl = urlData?.publicUrl || profilePicUrl;
          }
        }
      } catch { /* keep original URL */ }
    }

    // Update account
    const updates: Record<string, unknown> = {
      linkedin_url: linkedinUrl,
      avatar_url: storedAvatarUrl,
      connections_count: connections,
      followers_count: followers,
      linkedin_headline: headline,
      last_synced_at: new Date().toISOString(),
    };

    const { data: updated, error: updateError } = await supabase
      .from('linkedin_avatar_accounts')
      .update(updates)
      .eq('id', accountId)
      .select()
      .single();

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ success: true, data: updated, fullName }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[sync-avatar-linkedin] Error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
