import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Music, ExternalLink } from "lucide-react";

interface Playlist {
  id: string;
  name: string;
  url: string;
  type: 'playlist' | 'podcast';
}

interface MusicSectionProps {
  spotifyConnected?: boolean;
  appleMusicConnected?: boolean;
  spotifyPlaylists?: Playlist[];
  appleMusicPlaylists?: Playlist[];
}

export function MusicSection({
  spotifyConnected,
  appleMusicConnected,
  spotifyPlaylists = [],
  appleMusicPlaylists = [],
}: MusicSectionProps) {
  const hasMusic = (spotifyConnected && spotifyPlaylists.length > 0) || 
                   (appleMusicConnected && appleMusicPlaylists.length > 0);

  if (!hasMusic) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="w-5 h-5" />
          Music & Podcasts
        </CardTitle>
        <CardDescription>
          Playlists and podcasts shared by this user
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Spotify Playlists */}
        {spotifyConnected && spotifyPlaylists.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#1DB954] flex items-center justify-center">
                <Music className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-semibold">Spotify</h3>
            </div>
            <div className="grid gap-3">
              {spotifyPlaylists.map((playlist) => (
                <a
                  key={playlist.id}
                  href={playlist.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                      <Music className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{playlist.name}</p>
                      <Badge variant="secondary" className="mt-1">
                        {playlist.type}
                      </Badge>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Apple Music Playlists */}
        {appleMusicConnected && appleMusicPlaylists.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FA243C] to-[#FB5C74] flex items-center justify-center">
                <Music className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-semibold">Apple Music</h3>
            </div>
            <div className="grid gap-3">
              {appleMusicPlaylists.map((playlist) => (
                <a
                  key={playlist.id}
                  href={playlist.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                      <Music className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{playlist.name}</p>
                      <Badge variant="secondary" className="mt-1">
                        {playlist.type}
                      </Badge>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                </a>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}