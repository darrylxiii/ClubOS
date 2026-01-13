const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// NOTE: yt-dlp is not available in Supabase Edge Runtime.
// This handler returns a 501 error explaining the limitation.
// Use a client-side solution or external service for YouTube downloads.
export const downloadYoutubeHandler = async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    return new Response(
        JSON.stringify({
            success: false,
            error: 'YouTube download is not available in edge runtime. The yt-dlp binary is not supported in Supabase Edge Functions. Please use a client-side solution or external service instead.'
        }),
        {
            status: 501,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
    );
};