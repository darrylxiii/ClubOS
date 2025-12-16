import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { domain } = await req.json();
    
    if (!domain) {
      return new Response(
        JSON.stringify({ error: 'Domain is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean domain (remove protocol, www, paths)
    const cleanDomain = domain
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0]
      .toLowerCase()
      .trim();

    console.log(`Fetching brand assets for domain: ${cleanDomain}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check cache first
    const { data: cached } = await supabase
      .from('brand_assets_cache')
      .select('*')
      .eq('domain', cleanDomain)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (cached) {
      console.log(`Cache hit for ${cleanDomain}`);
      return new Response(
        JSON.stringify({
          logo_url: cached.logo_url,
          icon_url: cached.icon_url,
          brand_name: cached.brand_name,
          primary_color: cached.primary_color,
          colors: cached.colors,
          cached: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch from Brandfetch API
    const brandfetchKey = Deno.env.get('BRANDFETCH_API_KEY');
    if (!brandfetchKey) {
      console.error('BRANDFETCH_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Brandfetch API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch(`https://api.brandfetch.io/v2/brands/${cleanDomain}`, {
      headers: {
        'Authorization': `Bearer ${brandfetchKey}`,
      },
    });

    if (!response.ok) {
      console.log(`Brandfetch API returned ${response.status} for ${cleanDomain}`);
      
      // Cache the miss to avoid repeated failed calls
      await supabase
        .from('brand_assets_cache')
        .upsert({
          domain: cleanDomain,
          logo_url: null,
          icon_url: null,
          brand_name: null,
          primary_color: null,
          colors: null,
          fetched_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days for misses
        }, { onConflict: 'domain' });

      return new Response(
        JSON.stringify({ error: 'Brand not found', domain: cleanDomain }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const brandData = await response.json();
    console.log(`Brandfetch response for ${cleanDomain}:`, JSON.stringify(brandData).slice(0, 500));

    // Extract best logo (prefer SVG, then PNG)
    let logoUrl: string | null = null;
    let iconUrl: string | null = null;

    if (brandData.logos && brandData.logos.length > 0) {
      // Find primary logo
      const primaryLogo = brandData.logos.find((l: any) => l.type === 'logo') || brandData.logos[0];
      if (primaryLogo?.formats) {
        const svgFormat = primaryLogo.formats.find((f: any) => f.format === 'svg');
        const pngFormat = primaryLogo.formats.find((f: any) => f.format === 'png');
        logoUrl = svgFormat?.src || pngFormat?.src || primaryLogo.formats[0]?.src;
      }

      // Find icon
      const iconLogo = brandData.logos.find((l: any) => l.type === 'icon' || l.type === 'symbol');
      if (iconLogo?.formats) {
        const svgFormat = iconLogo.formats.find((f: any) => f.format === 'svg');
        const pngFormat = iconLogo.formats.find((f: any) => f.format === 'png');
        iconUrl = svgFormat?.src || pngFormat?.src || iconLogo.formats[0]?.src;
      }
    }

    // Extract colors
    let primaryColor: string | null = null;
    let colors: any[] = [];

    if (brandData.colors && brandData.colors.length > 0) {
      colors = brandData.colors.map((c: any) => ({
        hex: c.hex,
        type: c.type,
        brightness: c.brightness
      }));
      const primary = brandData.colors.find((c: any) => c.type === 'accent' || c.type === 'brand');
      primaryColor = primary?.hex || brandData.colors[0]?.hex;
    }

    const brandName = brandData.name || null;

    // Cache the result
    await supabase
      .from('brand_assets_cache')
      .upsert({
        domain: cleanDomain,
        logo_url: logoUrl,
        icon_url: iconUrl,
        brand_name: brandName,
        primary_color: primaryColor,
        colors: colors,
        fetched_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      }, { onConflict: 'domain' });

    console.log(`Cached brand assets for ${cleanDomain}: logo=${logoUrl ? 'yes' : 'no'}, icon=${iconUrl ? 'yes' : 'no'}`);

    return new Response(
      JSON.stringify({
        logo_url: logoUrl,
        icon_url: iconUrl,
        brand_name: brandName,
        primary_color: primaryColor,
        colors: colors,
        cached: false
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error fetching brand assets:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
