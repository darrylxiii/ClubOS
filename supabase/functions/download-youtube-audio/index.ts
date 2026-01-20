import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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
    // Note: yt-dlp must be installed in the environment
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
});

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}
