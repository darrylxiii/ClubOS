import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { publicCorsHeaders } from "../_shared/cors-config.ts";

const corsHeaders = publicCorsHeaders;

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders })
    }

    try {
        const { url } = await req.json()

        if (!url) {
            return new Response(
                JSON.stringify({ error: 'URL is required' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'bot-fetch-link-metadata' // Identify as a bot to get metadata
            }
        })

        if (!response.ok) {
            throw new Error(`Failed to fetch URL: ${response.statusText}`)
        }

        const html = await response.text()

        // Simple regex-based extraction to avoid heavy dependencies
        const getMetaTag = (name: string) => {
            const match = html.match(new RegExp(`<meta property="${name}" content="([^"]*)"`, 'i')) ||
                html.match(new RegExp(`<meta name="${name}" content="([^"]*)"`, 'i'))
            return match ? match[1] : undefined
        }

        const title = getMetaTag('og:title') || getMetaTag('twitter:title') || html.match(/<title>([^<]*)<\/title>/i)?.[1]
        const description = getMetaTag('og:description') || getMetaTag('twitter:description') || getMetaTag('description')
        const image = getMetaTag('og:image') || getMetaTag('twitter:image')
        const siteName = getMetaTag('og:site_name')

        return new Response(
            JSON.stringify({ title, description, image, siteName }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return new Response(
            JSON.stringify({ error: message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
