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

    return null;
}

export const downloadYoutubeHandler = async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { youtubeUrl } = await req.json();

        if (!youtubeUrl) {
            throw new Error('YouTube URL is required');
        }

        console.log('Downloading audio from YouTube:', youtubeUrl);

        // Extract video ID from URL
        const videoId = extractVideoId(youtubeUrl);
        if (!videoId) {
            throw new Error('Invalid YouTube URL');
        }

        // Use yt-dlp via Deno subprocess
        const command = new Deno.Command("yt-dlp", {
            args: [
                "--extract-audio",
                "--audio-format", "mp3",
                "--audio-quality", "0",
                "--output", "-",
                "--print", "%(title)s|||%(uploader)s|||%(duration)s|||%(thumbnail)s",
                "--no-playlist",
                "--max-filesize", "20M",
                youtubeUrl
            ],
            stdout: "piped",
            stderr: "piped",
        });

        const process = command.spawn();
        const { stdout, stderr } = await process.output();
        const status = await process.status;

        if (!status.success) {
            const errorText = new TextDecoder().decode(stderr);
            console.error('yt-dlp error:', errorText);
            throw new Error('Failed to download audio from YouTube');
        }

        // Parse metadata from output
        const stderrText = new TextDecoder().decode(stderr);
        const metadataMatch = stderrText.match(/(.+?)\|\|\|(.+?)\|\|\|(.+?)\|\|\|(.+?)$/m);

        let title = 'Downloaded Track';
        let artist = 'Unknown Artist';
        let duration = 0;
        let thumbnailUrl = '';

        if (metadataMatch) {
            title = metadataMatch[1] || title;
            artist = metadataMatch[2] || artist;
            duration = parseInt(metadataMatch[3]) || duration;
            thumbnailUrl = metadataMatch[4] || thumbnailUrl;
        }

        // Get audio data
        const audioData = stdout;

        // Convert to base64 for transfer
        const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioData)));

        return new Response(
            JSON.stringify({
                success: true,
                audioData: base64Audio,
                metadata: {
                    title,
                    artist,
                    duration,
                    thumbnailUrl,
                    filename: `${videoId}.mp3`
                }
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        );
    } catch (error: any) {
        console.error('Error in download-youtube-audio:', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message || 'Failed to download YouTube audio'
            }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        );
    }
};
