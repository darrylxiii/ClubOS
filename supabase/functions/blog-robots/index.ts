import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async () => {
  const baseUrl = 'https://os.thequantumclub.com';
  const sitemapUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/blog-sitemap`;

  const robotsTxt = `User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Twitterbot
Allow: /

User-agent: facebookexternalhit
Allow: /

User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/

Sitemap: ${sitemapUrl}

Host: ${baseUrl}
`;

  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400',
    },
  });
});
