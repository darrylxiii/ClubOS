import { useState } from 'react';
import { Play, Pause, SkipForward, Volume2, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export function MusicPlayerPanel() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState([75]);

  // Mock data - replace with real Spotify integration
  const currentTrack = {
    title: "The Quantum Club Radio",
    artist: "Curated Selection",
    album: "Now Playing",
    albumArt: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop",
    duration: 240,
    currentTime: 120,
  };

  const listeningNow = [
    {
      id: '1',
      name: 'Sarah Chen',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
      role: 'Senior Designer',
    },
    {
      id: '2',
      name: 'Marcus Johnson',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus',
      role: 'Product Manager',
    },
    {
      id: '3',
      name: 'Elena Rodriguez',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Elena',
      role: 'Tech Lead',
    },
  ];

  return (
    <div className="rounded-3xl shadow-2xl overflow-hidden bg-black/20 backdrop-blur-xl border border-white/10">
      {/* Header */}
      <div className="px-5 py-4 flex items-center gap-2 border-b border-white/10">
        <Radio className="h-5 w-5 text-primary" />
        <h2 className="text-base font-semibold text-foreground">The Quantum Club Radio</h2>
      </div>

      {/* Now Playing Section */}
      <div className="p-5">
        <div className="relative">
          <img
            src={currentTrack.albumArt}
            alt={currentTrack.album}
            className="w-full aspect-square rounded-2xl object-cover shadow-lg"
          />
          
          <div className="mt-4">
            <h3 className="font-semibold text-base truncate text-foreground">{currentTrack.title}</h3>
            <p className="text-sm text-muted-foreground truncate">{currentTrack.artist}</p>
          </div>

          {/* Progress Bar */}
          <div className="mt-3">
            <Slider
              value={[(currentTrack.currentTime / currentTrack.duration) * 100]}
              max={100}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{Math.floor(currentTrack.currentTime / 60)}:{(currentTrack.currentTime % 60).toString().padStart(2, '0')}</span>
              <span>{Math.floor(currentTrack.duration / 60)}:{(currentTrack.duration % 60).toString().padStart(2, '0')}</span>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center justify-center gap-4 mt-4">
            <Button
              size="icon"
              className="h-12 w-12 rounded-full"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6 ml-0.5" />
              )}
            </Button>
            <Button variant="ghost" size="icon" className="text-foreground">
              <SkipForward className="h-5 w-5" />
            </Button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-2 mt-4">
            <Volume2 className="h-4 w-4 text-muted-foreground" />
            <Slider
              value={volume}
              onValueChange={setVolume}
              max={100}
              step={1}
              className="flex-1"
            />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-white/20 mx-5" />

      {/* Listening Now - Stacked Avatars */}
      <div className="p-5">
        <p className="text-sm font-semibold text-foreground mb-3">Listening Now</p>
        <div className="flex flex-col gap-2">
          {listeningNow.map((user, index) => (
            <div
              key={user.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl transition-all duration-200",
                "bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10"
              )}
              style={{
                animationDelay: `${index * 100}ms`
              }}
            >
              <Avatar className="h-10 w-10 border-2 border-primary/50">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate text-foreground">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.role}</p>
              </div>
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-white/20 mx-5" />

      {/* Connect Spotify CTA */}
      <div className="p-5">
        <div className="text-center p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-sm font-medium mb-3 text-foreground">Want to listen to your own music?</p>
          <Button className="w-full" variant="default">
            Connect Spotify
          </Button>
        </div>
      </div>
    </div>
  );
}
