import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const proxycurlKey = Deno.env.get('PROXYCURL_API_KEY');
    const apifyKey = Deno.env.get('APIFY_API_KEY');

    // Verify caller is authenticated
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { linkedinUrl } = await req.json();
    if (!linkedinUrl || typeof linkedinUrl !== 'string' || !linkedinUrl.includes('linkedin.com/in/')) {
      return new Response(JSON.stringify({ error: 'Invalid LinkedIn URL' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let profilePicUrl: string | null = null;

    // Try ProxyCurl first
    if (proxycurlKey) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(
          `https://nubela.co/proxycurl/api/v2/linkedin?url=${encodeURIComponent(linkedinUrl)}&use_cache=if-present`,
          {
            headers: { 'Authorization': `Bearer ${proxycurlKey}` },
            signal: controller.signal,
          }
        );
        clearTimeout(timeout);

        if (response.ok) {
          const data = await response.json();
          profilePicUrl = data.profile_pic_url || null;
        }
      } catch (e) {
        console.error('ProxyCurl avatar fetch failed:', e);
      }
    }

    // Fallback to Apify
    if (!profilePicUrl && apifyKey) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);

        const runResponse = await fetch(
          `https://api.apify.com/v2/acts/curious_coder~linkedin-profile-scraper/run-sync-get-dataset-items?token=${apifyKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ startUrls: [{ url: linkedinUrl }] }),
            signal: controller.signal,
          }
        );
        clearTimeout(timeout);

        if (runResponse.ok) {
          const items = await runResponse.json();
          if (items?.[0]?.profilePicture) {
            profilePicUrl = items[0].profilePicture;
          }
        }
      } catch (e) {
        console.error('Apify avatar fetch failed:', e);
      }
    }

    if (!profilePicUrl) {
      return new Response(JSON.stringify({ avatarUrl: null, message: 'No profile photo found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Download the image and upload to storage
    try {
      const imgResponse = await fetch(profilePicUrl);
      if (!imgResponse.ok) throw new Error('Failed to download image');

      const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';
      const ext = contentType.includes('png') ? 'png' : 'jpg';
      const imgBuffer = await imgResponse.arrayBuffer();
      const filePath = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, imgBuffer, {
          contentType,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);

      return new Response(JSON.stringify({ avatarUrl: publicUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (e) {
      console.error('Image upload failed:', e);
      // Return the original URL as fallback
      await supabase.from('profiles').update({ avatar_url: profilePicUrl }).eq('id', user.id);
      return new Response(JSON.stringify({ avatarUrl: profilePicUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('fetch-linkedin-avatar error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
