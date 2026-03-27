import { createAuthenticatedHandler } from '../_shared/handler.ts';
import { resilientFetch } from '../_shared/resilient-fetch.ts';

Deno.serve(createAuthenticatedHandler(async (req, ctx) => {
    const apifyKey = Deno.env.get('APIFY_API_KEY');
    const supabase = ctx.supabase;

    const { linkedinUrl } = await req.json();
    if (!linkedinUrl || typeof linkedinUrl !== 'string' || !linkedinUrl.includes('linkedin.com/in/')) {
      return new Response(JSON.stringify({ error: 'Invalid LinkedIn URL' }), {
        status: 400,
        headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let profilePicUrl: string | null = null;

    // Try Apify
    if (apifyKey) {
      try {
        const { response: runResponse } = await resilientFetch(
          `https://api.apify.com/v2/acts/curious_coder~linkedin-profile-scraper/run-sync-get-dataset-items?token=${apifyKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ startUrls: [{ url: linkedinUrl }] }),
          },
          {
            timeoutMs: 30_000,
            maxRetries: 1,
            retryNonIdempotent: true,
            service: 'apify',
            operation: 'linkedin-avatar-scrape',
          }
        );

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
        headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Download the image and upload to storage — NO fallback to external URLs
    try {
      const imgResponse = await fetch(profilePicUrl);
      if (!imgResponse.ok) throw new Error('Failed to download image');

      const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';
      const ext = contentType.includes('png') ? 'png' : 'jpg';
      const imgBuffer = await imgResponse.arrayBuffer();
      const filePath = `${ctx.user.id}/avatar.${ext}`;

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

      // Update profile with storage URL only
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', ctx.user.id);

      return new Response(JSON.stringify({ avatarUrl: publicUrl }), {
        headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (e) {
      console.error('Image upload failed:', e);
      // Do NOT fall back to external URL — return null instead
      return new Response(JSON.stringify({ avatarUrl: null, message: 'Found photo but failed to store it. Please upload manually.' }), {
        headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' }
      });
    }

}));
