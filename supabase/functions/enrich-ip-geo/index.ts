import { createHandler } from '../_shared/handler.ts';

interface GeoData {
  country_code: string | null;
  country_name: string | null;
  city: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  isp: string | null;
  is_vpn: boolean;
  is_proxy: boolean;
  is_tor: boolean;
  threat_score: number;
}

async function fetchGeoData(ip: string): Promise<GeoData> {
  try {
    // Use ip-api.com (free tier: 45 requests/minute)
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,lat,lon,isp,proxy,hosting`);
    const data = await response.json();
    
    if (data.status === 'fail') {
      console.log(`[enrich-ip-geo] ip-api.com failed for ${ip}: ${data.message}`);
      return getDefaultGeoData();
    }
    
    // Calculate threat score based on various factors
    let threatScore = 0;
    if (data.proxy) threatScore += 30;
    if (data.hosting) threatScore += 20; // Data center IPs are suspicious
    
    return {
      country_code: data.countryCode || null,
      country_name: data.country || null,
      city: data.city || null,
      region: data.regionName || null,
      latitude: data.lat || null,
      longitude: data.lon || null,
      isp: data.isp || null,
      is_vpn: data.hosting || false, // hosting flag often indicates VPN/datacenter
      is_proxy: data.proxy || false,
      is_tor: false, // ip-api doesn't detect Tor, would need separate check
      threat_score: threatScore
    };
  } catch (error) {
    console.error(`[enrich-ip-geo] Error fetching geo data for ${ip}:`, error);
    return getDefaultGeoData();
  }
}

function getDefaultGeoData(): GeoData {
  return {
    country_code: null,
    country_name: null,
    city: null,
    region: null,
    latitude: null,
    longitude: null,
    isp: null,
    is_vpn: false,
    is_proxy: false,
    is_tor: false,
    threat_score: 0
  };
}

Deno.serve(createHandler(async (req, ctx) => {
  const { ip_address, ip_addresses } = await req.json();
    const ipsToEnrich = ip_addresses || (ip_address ? [ip_address] : []);

    if (ipsToEnrich.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No IP addresses provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[enrich-ip-geo] Enriching ${ipsToEnrich.length} IP addresses`);

    const results: Record<string, GeoData> = {};
    let enrichedCount = 0;
    let cachedCount = 0;

    for (const ip of ipsToEnrich) {
      // Check cache first (data less than 7 days old)
      const { data: cached } = await ctx.supabase
        .from('ip_geo_cache')
        .select('*')
        .eq('ip_address', ip)
        .gte('last_updated', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .single();

      if (cached) {
        results[ip] = {
          country_code: cached.country_code,
          country_name: cached.country_name,
          city: cached.city,
          region: cached.region,
          latitude: cached.latitude,
          longitude: cached.longitude,
          isp: cached.isp,
          is_vpn: cached.is_vpn,
          is_proxy: cached.is_proxy,
          is_tor: cached.is_tor,
          threat_score: cached.threat_score
        };
        cachedCount++;
        continue;
      }

      // Fetch fresh data
      const geoData = await fetchGeoData(ip);
      results[ip] = geoData;

      // Store in cache
      const { error: upsertError } = await ctx.supabase
        .from('ip_geo_cache')
        .upsert({
          ip_address: ip,
          ...geoData,
          last_updated: new Date().toISOString()
        }, { onConflict: 'ip_address' });

      if (upsertError) {
        console.error(`[enrich-ip-geo] Cache upsert error for ${ip}:`, upsertError);
      }
      
      enrichedCount++;

      // Rate limiting: 45 requests/minute for ip-api.com
      if (enrichedCount % 40 === 0) {
        console.log('[enrich-ip-geo] Rate limit pause...');
        await new Promise(resolve => setTimeout(resolve, 60000));
      }
    }

    console.log(`[enrich-ip-geo] Complete: ${enrichedCount} enriched, ${cachedCount} from cache`);

    return new Response(
      JSON.stringify({
        success: true,
        enriched: enrichedCount,
        cached: cachedCount,
        results
      }),
      { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
    );

}));
