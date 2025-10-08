import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Music, Plus, X, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Playlist {
  id: string;
  name: string;
  url: string;
  type: 'playlist' | 'podcast';
}

interface MusicConnectionsProps {
  spotifyConnected: boolean;
  appleMusicConnected: boolean;
  spotifyPlaylists: Playlist[];
  appleMusicPlaylists: Playlist[];
  onUpdate: () => void;
}

export function MusicConnections({
  spotifyConnected,
  appleMusicConnected,
  spotifyPlaylists,
  appleMusicPlaylists,
  onUpdate,
}: MusicConnectionsProps) {
  const { user } = useAuth();
  const [showSpotifyInput, setShowSpotifyInput] = useState(false);
  const [showAppleMusicInput, setShowAppleMusicInput] = useState(false);
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [appleMusicUrl, setAppleMusicUrl] = useState("");
  const [spotifyType, setSpotifyType] = useState<'playlist' | 'podcast'>('playlist');
  const [appleMusicType, setAppleMusicType] = useState<'playlist' | 'podcast'>('playlist');

  const handleConnectSpotify = async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          spotify_connected: true,
          spotify_playlists: []
        } as any)
        .eq('id', user.id);

      if (error) throw error;
      
      toast.success('Spotify connected!');
      onUpdate();
    } catch (error) {
      console.error('Error connecting Spotify:', error);
      toast.error('Failed to connect Spotify');
    }
  };

  const handleConnectAppleMusic = async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          apple_music_connected: true,
          apple_music_playlists: []
        } as any)
        .eq('id', user.id);

      if (error) throw error;
      
      toast.success('Apple Music connected!');
      onUpdate();
    } catch (error) {
      console.error('Error connecting Apple Music:', error);
      toast.error('Failed to connect Apple Music');
    }
  };

  const handleAddSpotifyPlaylist = async () => {
    if (!user || !spotifyUrl) return;

    const playlistId = spotifyUrl.split('/').pop()?.split('?')[0] || '';
    const newPlaylist: Playlist = {
      id: playlistId,
      name: spotifyType === 'playlist' ? 'Spotify Playlist' : 'Spotify Podcast',
      url: spotifyUrl,
      type: spotifyType,
    };

    const updatedPlaylists = [...spotifyPlaylists, newPlaylist];

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ spotify_playlists: updatedPlaylists } as any)
        .eq('id', user.id);

      if (error) throw error;

      toast.success(`${spotifyType === 'playlist' ? 'Playlist' : 'Podcast'} added!`);
      setSpotifyUrl('');
      setShowSpotifyInput(false);
      onUpdate();
    } catch (error) {
      console.error('Error adding playlist:', error);
      toast.error('Failed to add playlist');
    }
  };

  const handleAddAppleMusicPlaylist = async () => {
    if (!user || !appleMusicUrl) return;

    const playlistId = appleMusicUrl.split('/').pop()?.split('?')[0] || '';
    const newPlaylist: Playlist = {
      id: playlistId,
      name: appleMusicType === 'playlist' ? 'Apple Music Playlist' : 'Apple Music Podcast',
      url: appleMusicUrl,
      type: appleMusicType,
    };

    const updatedPlaylists = [...appleMusicPlaylists, newPlaylist];

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ apple_music_playlists: updatedPlaylists } as any)
        .eq('id', user.id);

      if (error) throw error;

      toast.success(`${appleMusicType === 'playlist' ? 'Playlist' : 'Podcast'} added!`);
      setAppleMusicUrl('');
      setShowAppleMusicInput(false);
      onUpdate();
    } catch (error) {
      console.error('Error adding playlist:', error);
      toast.error('Failed to add playlist');
    }
  };

  const handleRemovePlaylist = async (platform: 'spotify' | 'appleMusic', playlistId: string) => {
    if (!user) return;

    const field = platform === 'spotify' ? 'spotify_playlists' : 'apple_music_playlists';
    const currentPlaylists = platform === 'spotify' ? spotifyPlaylists : appleMusicPlaylists;
    const updatedPlaylists = currentPlaylists.filter(p => p.id !== playlistId);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ [field]: updatedPlaylists } as any)
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Removed from profile');
      onUpdate();
    } catch (error) {
      console.error('Error removing playlist:', error);
      toast.error('Failed to remove');
    }
  };

  const handleDisconnect = async (platform: 'spotify' | 'appleMusic') => {
    if (!user) return;

    const updates = platform === 'spotify' 
      ? { spotify_connected: false, spotify_playlists: null } 
      : { apple_music_connected: false, apple_music_playlists: null };

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates as any)
        .eq('id', user.id);

      if (error) throw error;

      toast.success(`${platform === 'spotify' ? 'Spotify' : 'Apple Music'} disconnected`);
      onUpdate();
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast.error('Failed to disconnect');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="w-5 h-5" />
          Music Connections
        </CardTitle>
        <CardDescription>
          Share your favorite playlists and podcasts on your profile
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Spotify Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#1DB954] flex items-center justify-center">
                <Music className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium">Spotify</p>
                <p className="text-sm text-muted-foreground">
                  {spotifyConnected ? 'Connected' : 'Not connected'}
                </p>
              </div>
            </div>
            {!spotifyConnected ? (
              <Button onClick={handleConnectSpotify} size="sm">
                Connect
              </Button>
            ) : (
              <Button onClick={() => handleDisconnect('spotify')} variant="outline" size="sm">
                Disconnect
              </Button>
            )}
          </div>

          {spotifyConnected && (
            <div className="space-y-3 ml-13">
              {spotifyPlaylists.map((playlist) => (
                <div key={playlist.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{playlist.type}</Badge>
                    <a href={playlist.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm hover:underline">
                      {playlist.name}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemovePlaylist('spotify', playlist.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}

              {!showSpotifyInput ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSpotifyInput(true)}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Playlist or Podcast
                </Button>
              ) : (
                <div className="space-y-3 p-3 border rounded-lg">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <div className="flex gap-2">
                      <Button
                        variant={spotifyType === 'playlist' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSpotifyType('playlist')}
                      >
                        Playlist
                      </Button>
                      <Button
                        variant={spotifyType === 'podcast' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSpotifyType('podcast')}
                      >
                        Podcast
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Spotify URL</Label>
                    <Input
                      placeholder="https://open.spotify.com/..."
                      value={spotifyUrl}
                      onChange={(e) => setSpotifyUrl(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddSpotifyPlaylist} size="sm">
                      Add
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowSpotifyInput(false);
                        setSpotifyUrl('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* Apple Music Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FA243C] to-[#FB5C74] flex items-center justify-center">
                <Music className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium">Apple Music</p>
                <p className="text-sm text-muted-foreground">
                  {appleMusicConnected ? 'Connected' : 'Not connected'}
                </p>
              </div>
            </div>
            {!appleMusicConnected ? (
              <Button onClick={handleConnectAppleMusic} size="sm">
                Connect
              </Button>
            ) : (
              <Button onClick={() => handleDisconnect('appleMusic')} variant="outline" size="sm">
                Disconnect
              </Button>
            )}
          </div>

          {appleMusicConnected && (
            <div className="space-y-3 ml-13">
              {appleMusicPlaylists.map((playlist) => (
                <div key={playlist.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{playlist.type}</Badge>
                    <a href={playlist.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm hover:underline">
                      {playlist.name}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemovePlaylist('appleMusic', playlist.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}

              {!showAppleMusicInput ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAppleMusicInput(true)}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Playlist or Podcast
                </Button>
              ) : (
                <div className="space-y-3 p-3 border rounded-lg">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <div className="flex gap-2">
                      <Button
                        variant={appleMusicType === 'playlist' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAppleMusicType('playlist')}
                      >
                        Playlist
                      </Button>
                      <Button
                        variant={appleMusicType === 'podcast' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAppleMusicType('podcast')}
                      >
                        Podcast
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Apple Music URL</Label>
                    <Input
                      placeholder="https://music.apple.com/..."
                      value={appleMusicUrl}
                      onChange={(e) => setAppleMusicUrl(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddAppleMusicPlaylist} size="sm">
                      Add
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowAppleMusicInput(false);
                        setAppleMusicUrl('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}