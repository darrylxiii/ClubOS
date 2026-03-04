import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { logAIUsage, extractClientInfo } from "../_shared/ai-logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { postId, prompt } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Use the correct supported image generation model
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-3-pro-image-preview',
        messages: [
          {
            role: 'user',
            content: `Generate a professional, editorial-style hero image for a blog article. The image should be clean, modern, and suitable for a luxury talent platform. Style: dark tones with gold accents, minimal, executive feel. Subject: ${prompt}`,
          },
        ],
        modalities: ['image', 'text'],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded', code: 'AI_RATE_LIMITED' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted', code: 'AI_CREDITS_EXHAUSTED' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`Image generation failed: ${response.statusText}`);
    }

    const result = await response.json();
    const imageData = result.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    let imageUrl = '/placeholder.svg';
    
    if (imageData && postId) {
      // Upload to storage
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
      const bytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      
      const fileName = `blog-hero-${postId}-${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from('blog-images')
        .upload(fileName, bytes, { contentType: 'image/png', upsert: true });

      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('blog-images').getPublicUrl(fileName);
        imageUrl = urlData.publicUrl;
      } else {
        console.error('Image upload error:', uploadError);
      }
    }

    if (postId && imageUrl !== '/placeholder.svg') {
      await supabase
        .from('blog_posts')
        .update({ hero_image: { url: imageUrl, alt: prompt } })
        .eq('id', postId);
    }

    return new Response(JSON.stringify({ imageUrl, postId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Blog image generation error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
