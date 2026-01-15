import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, X, ExternalLink, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Playlist {
  id: string;
  name: string;
  url: string;
  type: 'playlist' | 'podcast';
}

interface SocialConnectionsProps {
  socialConnections: {
    linkedin: boolean;
    instagram: boolean;
    twitter: boolean;
    github: boolean;
    instagramUsername: string;
    twitterUsername: string;
    githubUsername: string;
  };
  musicConnections: {
    spotifyConnected: boolean;
    appleMusicConnected: boolean;
    spotifyPlaylists: Playlist[];
    appleMusicPlaylists: Playlist[];
  };
  onUpdate: () => void;
  onConnectSocial: (provider: string) => void;
  onDisconnectSocial: (platform: string) => void;
}

export function SocialConnections({
  socialConnections,
  musicConnections,
  onUpdate,
  onConnectSocial,
  onDisconnectSocial,
}: SocialConnectionsProps) {
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
    } catch (err) {
      console.error('Error connecting Spotify:', err);
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
    } catch (err) {
      console.error('Error connecting Apple Music:', err);
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

    const updatedPlaylists = [...musicConnections.spotifyPlaylists, newPlaylist];

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
    } catch (err) {
      console.error('Error adding playlist:', err);
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

    const updatedPlaylists = [...musicConnections.appleMusicPlaylists, newPlaylist];

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
    } catch (err) {
      console.error('Error adding playlist:', err);
      toast.error('Failed to add playlist');
    }
  };

  const handleRemovePlaylist = async (platform: 'spotify' | 'appleMusic', playlistId: string) => {
    if (!user) return;

    const field = platform === 'spotify' ? 'spotify_playlists' : 'apple_music_playlists';
    const currentPlaylists = platform === 'spotify' ? musicConnections.spotifyPlaylists : musicConnections.appleMusicPlaylists;
    const updatedPlaylists = currentPlaylists.filter(p => p.id !== playlistId);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ [field]: updatedPlaylists } as any)
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Removed from profile');
      onUpdate();
    } catch (err) {
      console.error('Error removing playlist:', err);
      toast.error('Failed to remove');
    }
  };

  const handleDisconnectMusic = async (platform: 'spotify' | 'appleMusic') => {
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
    } catch (err) {
      console.error('Error disconnecting:', err);
      toast.error('Failed to disconnect');
    }
  };

  return (
    <Card className="border-0 bg-card/30 backdrop-blur-md scroll-mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-foreground" />
          Social Connections
        </CardTitle>
        <CardDescription>
          Connect your professional profiles and share your favorite music
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-accent/5 border border-accent/20 rounded-lg">
          <p className="text-xs text-muted-foreground">
            <strong>Professional Presence:</strong> Connecting your profiles helps verify your identity and allows others to learn more about your professional background and interests.
          </p>
        </div>

        {/* LinkedIn */}
        <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-background/30 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8 text-foreground" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            <div>
              <p className="font-medium">LinkedIn</p>
              <p className="text-sm text-muted-foreground">
                {socialConnections.linkedin ? 'Connected' : 'Not connected'}
              </p>
            </div>
          </div>
          {socialConnections.linkedin ? (
            <Button variant="outline" size="sm" onClick={() => onDisconnectSocial('linkedin')}>
              <XCircle className="w-4 h-4 mr-2" />
              Disconnect
            </Button>
          ) : (
            <Button size="sm" onClick={() => onConnectSocial('linkedin_oidc')}>
              Connect
            </Button>
          )}
        </div>

        {/* Instagram */}
        <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-background/30 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8 text-foreground" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
            <div>
              <p className="font-medium">Instagram</p>
              <p className="text-sm text-muted-foreground">
                {socialConnections.instagram ? `@${socialConnections.instagramUsername}` : 'Not connected'}
              </p>
            </div>
          </div>
          {socialConnections.instagram ? (
            <Button variant="outline" size="sm" onClick={() => onDisconnectSocial('instagram')}>
              <XCircle className="w-4 h-4 mr-2" />
              Disconnect
            </Button>
          ) : (
            <Button size="sm" onClick={() => onConnectSocial('instagram')}>
              Connect
            </Button>
          )}
        </div>

        {/* X (Twitter) */}
        <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-background/30 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8 text-foreground" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            <div>
              <p className="font-medium">X (Twitter)</p>
              <p className="text-sm text-muted-foreground">
                {socialConnections.twitter ? `@${socialConnections.twitterUsername}` : 'Not connected'}
              </p>
            </div>
          </div>
          {socialConnections.twitter ? (
            <Button variant="outline" size="sm" onClick={() => onDisconnectSocial('twitter')}>
              <XCircle className="w-4 h-4 mr-2" />
              Disconnect
            </Button>
          ) : (
            <Button size="sm" onClick={() => onConnectSocial('twitter')}>
              Connect
            </Button>
          )}
        </div>

        {/* GitHub */}
        <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-background/30 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8 text-foreground" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            <div>
              <p className="font-medium">GitHub</p>
              <p className="text-sm text-muted-foreground">
                {socialConnections.github ? `@${socialConnections.githubUsername}` : 'Not connected'}
              </p>
            </div>
          </div>
          {socialConnections.github ? (
            <Button variant="outline" size="sm" onClick={() => onDisconnectSocial('github')}>
              <XCircle className="w-4 h-4 mr-2" />
              Disconnect
            </Button>
          ) : (
            <Button size="sm" onClick={() => onConnectSocial('github')}>
              Connect
            </Button>
          )}
        </div>

        {/* Spotify */}
        <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-background/30 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8 text-foreground" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
            <div>
              <p className="font-medium">Spotify</p>
              <p className="text-sm text-muted-foreground">
                {musicConnections.spotifyConnected ? 'Connected' : 'Not connected'}
              </p>
            </div>
          </div>
          {!musicConnections.spotifyConnected ? (
            <Button onClick={handleConnectSpotify} size="sm">
              Connect
            </Button>
          ) : (
            <Button onClick={() => handleDisconnectMusic('spotify')} variant="outline" size="sm">
              <XCircle className="w-4 h-4 mr-2" />
              Disconnect
            </Button>
          )}
        </div>

        <div className="space-y-4">
          {musicConnections.spotifyConnected && (
            <div className="space-y-3 ml-13">
              {musicConnections.spotifyPlaylists.map((playlist) => (
                <div key={playlist.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{playlist.type}</Badge>
                    <a href={playlist.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm hover:underline">
                      {playlist.name}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleRemovePlaylist('spotify', playlist.id)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}

              {!showSpotifyInput ? (
                <Button variant="outline" size="sm" onClick={() => setShowSpotifyInput(true)} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Playlist or Podcast
                </Button>
              ) : (
                <div className="space-y-3 p-3 border rounded-lg">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <div className="flex gap-2">
                      <Button variant={spotifyType === 'playlist' ? 'default' : 'outline'} size="sm" onClick={() => setSpotifyType('playlist')}>
                        Playlist
                      </Button>
                      <Button variant={spotifyType === 'podcast' ? 'default' : 'outline'} size="sm" onClick={() => setSpotifyType('podcast')}>
                        Podcast
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Spotify URL</Label>
                    <Input placeholder="https://open.spotify.com/..." value={spotifyUrl} onChange={(e) => setSpotifyUrl(e.target.value)} />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddSpotifyPlaylist} size="sm">Add</Button>
                    <Button variant="outline" size="sm" onClick={() => { setShowSpotifyInput(false); setSpotifyUrl(''); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Apple Music */}
        <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-background/30 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8 dark:fill-white fill-black" viewBox="0 0 814 1000" xmlns="http://www.w3.org/2000/svg">
              <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/>
            </svg>
            <div>
              <p className="font-medium">Apple Music</p>
              <p className="text-sm text-muted-foreground">
                {musicConnections.appleMusicConnected ? 'Connected' : 'Not connected'}
              </p>
            </div>
          </div>
          {!musicConnections.appleMusicConnected ? (
            <Button onClick={handleConnectAppleMusic} size="sm">
              Connect
            </Button>
          ) : (
            <Button onClick={() => handleDisconnectMusic('appleMusic')} variant="outline" size="sm">
              <XCircle className="w-4 h-4 mr-2" />
              Disconnect
            </Button>
          )}
        </div>

        <div className="space-y-4">
          {musicConnections.appleMusicConnected && (
            <div className="space-y-3 ml-13">
              {musicConnections.appleMusicPlaylists.map((playlist) => (
                <div key={playlist.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{playlist.type}</Badge>
                    <a href={playlist.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm hover:underline">
                      {playlist.name}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleRemovePlaylist('appleMusic', playlist.id)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}

              {!showAppleMusicInput ? (
                <Button variant="outline" size="sm" onClick={() => setShowAppleMusicInput(true)} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Playlist or Podcast
                </Button>
              ) : (
                <div className="space-y-3 p-3 border rounded-lg">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <div className="flex gap-2">
                      <Button variant={appleMusicType === 'playlist' ? 'default' : 'outline'} size="sm" onClick={() => setAppleMusicType('playlist')}>
                        Playlist
                      </Button>
                      <Button variant={appleMusicType === 'podcast' ? 'default' : 'outline'} size="sm" onClick={() => setAppleMusicType('podcast')}>
                        Podcast
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Apple Music URL</Label>
                    <Input placeholder="https://music.apple.com/..." value={appleMusicUrl} onChange={(e) => setAppleMusicUrl(e.target.value)} />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddAppleMusicPlaylist} size="sm">Add</Button>
                    <Button variant="outline" size="sm" onClick={() => { setShowAppleMusicInput(false); setAppleMusicUrl(''); }}>
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