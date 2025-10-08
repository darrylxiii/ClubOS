import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Users, Plus, X, ExternalLink, CheckCircle2, XCircle } from "lucide-react";
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
    } catch (error) {
      console.error('Error adding playlist:', error);
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
    } catch (error) {
      console.error('Error removing playlist:', error);
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
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast.error('Failed to disconnect');
    }
  };

  return (
    <Card className="border-0 shadow-glow bg-card/50 backdrop-blur-sm scroll-mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-accent" />
          Social Connections
        </CardTitle>
        <CardDescription>
          Connect your professional profiles and share your favorite music
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* LinkedIn */}
        <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-background/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#0A66C2] flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </div>
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
            <Button size="sm" onClick={() => onConnectSocial('linkedin_oidc')} className="bg-[#0A66C2] hover:bg-[#004182]">
              Connect
            </Button>
          )}
        </div>

        {/* Instagram */}
        <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-background/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#FCB045] flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </div>
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
            <Button size="sm" onClick={() => onConnectSocial('instagram')} className="bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#FCB045]">
              Connect
            </Button>
          )}
        </div>

        {/* X (Twitter) */}
        <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-background/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </div>
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
            <Button size="sm" onClick={() => onConnectSocial('twitter')} className="bg-black hover:bg-gray-900">
              Connect
            </Button>
          )}
        </div>

        {/* GitHub */}
        <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-background/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#24292e] flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </div>
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
            <Button size="sm" onClick={() => onConnectSocial('github')} className="bg-[#24292e] hover:bg-[#1b1f23]">
              Connect
            </Button>
          )}
        </div>

        <Separator />

        {/* Spotify */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#1DB954] flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
              </div>
              <div>
                <p className="font-medium">Spotify</p>
                <p className="text-sm text-muted-foreground">
                  {musicConnections.spotifyConnected ? 'Connected' : 'Not connected'}
                </p>
              </div>
            </div>
            {!musicConnections.spotifyConnected ? (
              <Button onClick={handleConnectSpotify} size="sm" className="bg-[#1DB954] hover:bg-[#1ed760]">
                Connect
              </Button>
            ) : (
              <Button onClick={() => handleDisconnectMusic('spotify')} variant="outline" size="sm">
                <XCircle className="w-4 h-4 mr-2" />
                Disconnect
              </Button>
            )}
          </div>

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

        <Separator />

        {/* Apple Music */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FA243C] to-[#FB5C74] flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.994 6.124a9.23 9.23 0 0 0-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043a5.022 5.022 0 0 0-1.284-.613 10.191 10.191 0 0 0-1.846-.384 32.788 32.788 0 0 0-2.585-.108c-.25-.007-.5-.007-.75-.007l-1.094-.002h-2.812c-.529.006-1.058.01-1.587.027a25.467 25.467 0 0 0-2.567.154c-.664.075-1.323.181-1.974.341-1.037.253-1.962.77-2.694 1.581-.728.808-1.175 1.79-1.39 2.888-.142.725-.207 1.46-.235 2.197a39.458 39.458 0 0 0-.014 2.385v2.333c0 .833.009 1.667.03 2.5.018.723.065 1.446.163 2.164.196 1.446.694 2.743 1.673 3.819a4.616 4.616 0 0 0 2.205 1.417c.878.283 1.79.408 2.712.481a33.78 33.78 0 0 0 3.02.09h3.083c.87-.002 1.74-.013 2.61-.046.723-.028 1.446-.082 2.164-.175.971-.125 1.92-.345 2.812-.763 1.066-.499 1.916-1.242 2.51-2.29.423-.746.686-1.562.827-2.42.181-1.1.237-2.212.259-3.324.015-.759.016-1.519.016-2.279 0-.516.002-1.031 0-1.547-.006-.573-.012-1.146-.032-1.719zm-4.666 13.063a7.972 7.972 0 0 1-.494.497c-.337.305-.738.52-1.186.68-.51.184-1.037.296-1.574.371a20.555 20.555 0 0 1-2.104.135c-.684.018-1.369.016-2.053.014h-2.271c-.678-.004-1.356-.008-2.033-.031-.633-.021-1.265-.06-1.893-.134-.558-.066-1.111-.16-1.653-.305a3.188 3.188 0 0 1-1.278-.678 3.28 3.28 0 0 1-.789-1.127c-.213-.494-.326-1.019-.391-1.556a15.097 15.097 0 0 1-.117-1.818c-.01-.696-.008-1.393-.006-2.09v-2.107c.002-.646.007-1.292.028-1.938.018-.565.054-1.13.116-1.692.066-.597.173-1.186.358-1.755.268-.824.703-1.542 1.386-2.07.502-.388 1.073-.629 1.69-.783a10.036 10.036 0 0 1 1.718-.259c.69-.064 1.382-.093 2.075-.11.716-.018 1.433-.018 2.15-.016h2.268c.664 0 1.329.003 1.993.019.648.015 1.296.041 1.943.087.613.043 1.224.107 1.829.217.668.121 1.317.305 1.927.606.579.285 1.05.685 1.397 1.224.329.511.518 1.082.626 1.685.11.613.16 1.234.18 1.857.024.761.028 1.523.028 2.284v2.168c0 .68-.003 1.36-.018 2.04-.014.623-.044 1.246-.105 1.866a8.556 8.556 0 0 1-.294 1.67c-.181.635-.468 1.217-.906 1.713z"/>
                  <path d="M12.581 8.81c0-1.473.016-2.947-.005-4.42-.006-.43.123-.59.557-.568.736.038 1.475.025 2.213.012.387-.007.425.135.424.468-.005 3.264-.004 6.529 0 9.794 0 .288-.062.44-.389.535a6.51 6.51 0 0 0-2.099 1.025 3.044 3.044 0 0 0-1.018 2.337c.002.714.316 1.319.886 1.797.634.532 1.394.772 2.211.766a3.118 3.118 0 0 0 2.58-1.425c.441-.649.616-1.374.603-2.151-.03-1.766-.015-3.532-.014-5.298 0-.22-.014-.439.005-.658.012-.143.088-.194.228-.192.355.005.71.001 1.065.001.41 0 .82.002 1.23-.001.188-.001.256.064.254.255-.004.354-.001.709-.001 1.064v.355c0 .175-.009.35.002.524.007.11-.031.165-.145.173-.223.016-.443.048-.665.074-.447.051-.892.105-1.336.177-.516.083-.987.254-1.409.554-.474.336-.795.791-.956 1.362a4.264 4.264 0 0 0-.185 1.303v3.555c0 .197.002.394-.001.591-.002.129.041.177.173.176.42-.003.841-.001 1.261-.001h.355c.174 0 .349.007.523-.002.11-.005.163.034.171.15.015.223.045.444.072.665.055.447.113.893.191 1.336.096.547.302 1.044.665 1.469.407.476.926.763 1.532.916.508.128 1.024.183 1.546.195 1.047.024 2.094.016 3.14.009.252-.002.503-.01.753-.022.124-.006.163-.071.162-.19-.003-.42-.001-.841-.001-1.261v-.363c0-.165-.008-.33.002-.494.006-.105-.025-.157-.141-.165-.223-.015-.445-.045-.667-.071-.438-.051-.873-.106-1.306-.179-.513-.086-.977-.262-1.392-.565-.476-.348-.788-.815-.942-1.393a4.205 4.205 0 0 1-.178-1.293c-.003-1.187-.001-2.374-.001-3.561v-.363c0-.162-.006-.325.002-.487.005-.102-.024-.152-.137-.16-.217-.014-.433-.043-.65-.068-.448-.053-.894-.11-1.337-.184-.52-.087-.989-.266-1.414-.572a3.028 3.028 0 0 1-1.022-1.568c-.137-.517-.19-1.042-.182-1.578.019-1.224.007-2.448.007-3.672z"/>
                </svg>
              </div>
              <div>
                <p className="font-medium">Apple Music</p>
                <p className="text-sm text-muted-foreground">
                  {musicConnections.appleMusicConnected ? 'Connected' : 'Not connected'}
                </p>
              </div>
            </div>
            {!musicConnections.appleMusicConnected ? (
              <Button onClick={handleConnectAppleMusic} size="sm" className="bg-gradient-to-br from-[#FA243C] to-[#FB5C74]">
                Connect
              </Button>
            ) : (
              <Button onClick={() => handleDisconnectMusic('appleMusic')} variant="outline" size="sm">
                <XCircle className="w-4 h-4 mr-2" />
                Disconnect
              </Button>
            )}
          </div>

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

        <div className="mt-4 p-4 bg-accent/5 border border-accent/20 rounded-lg">
          <p className="text-xs text-muted-foreground">
            <strong>Professional Presence:</strong> Connecting your profiles helps verify your identity and allows others to learn more about your professional background and interests.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}