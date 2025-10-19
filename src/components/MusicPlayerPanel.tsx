import { useState } from 'react';
import { Music, Play, Pause, SkipBack, SkipForward, Volume2, Users, Heart, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const MusicPlayerPanel = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState([75]);

  // Mock data - will be replaced with real Spotify integration
  const currentTrack = {
    title: "Quantum Sync",
    artist: "Club Anthem",
    album: "The Quantum Club Vol. 1",
    albumArt: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop",
    duration: "3:45",
    currentTime: "1:23"
  };

  const listeningNow = [
    { name: "Alex M.", avatar: "AM" },
    { name: "Sarah K.", avatar: "SK" },
    { name: "John D.", avatar: "JD" }
  ];

  const queuedTracks = [
    { title: "Victory Anthem", artist: "Achievement Unlocked", requestedBy: "Team Lead" },
    { title: "Focus Flow", artist: "Deep Work", requestedBy: "Sarah K." },
    { title: "Team Sync", artist: "Collaboration", requestedBy: "Alex M." }
  ];

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Music className="h-8 w-8 text-primary" />
            <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background animate-pulse" />
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Quantum Radio
            </h2>
            <p className="text-sm text-muted-foreground">Club Soundtrack</p>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Now Playing Card */}
        <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex gap-4">
              {/* Album Art with Quantum Effect */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/50 to-accent/50 rounded-lg blur-xl opacity-50 group-hover:opacity-75 transition-opacity animate-pulse" />
                <img 
                  src={currentTrack.albumArt} 
                  alt="Album Art"
                  className="relative w-24 h-24 rounded-lg shadow-lg object-cover"
                />
                {isPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {/* Track Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg truncate">{currentTrack.title}</h3>
                <p className="text-sm text-muted-foreground truncate">{currentTrack.artist}</p>
                <p className="text-xs text-muted-foreground truncate mt-1">{currentTrack.album}</p>
                
                {/* Progress Bar */}
                <div className="mt-3 space-y-1">
                  <Slider 
                    value={[40]} 
                    max={100} 
                    className="cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{currentTrack.currentTime}</span>
                    <span>{currentTrack.duration}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-center gap-4 mt-6">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <SkipBack className="h-4 w-4" />
              </Button>
              
              <Button 
                size="icon" 
                className="h-12 w-12 rounded-full shadow-lg hover:scale-105 transition-transform"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5 ml-0.5" />
                )}
              </Button>
              
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>

            {/* Volume & Actions */}
            <div className="flex items-center gap-4 mt-4">
              <Volume2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <Slider 
                value={volume} 
                onValueChange={setVolume}
                max={100} 
                className="flex-1"
              />
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Heart className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for Queue and Listening */}
        <Tabs defaultValue="queue" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="queue">Queue</TabsTrigger>
            <TabsTrigger value="listening">
              <Users className="h-4 w-4 mr-2" />
              Listening ({listeningNow.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="queue" className="space-y-3 mt-4">
            {queuedTracks.map((track, index) => (
              <Card key={index} className="border-border/50 hover:border-primary/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{track.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {track.requestedBy}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="listening" className="space-y-3 mt-4">
            <Card className="border-border/50">
              <CardHeader>
                <CardDescription>Members syncing to this track</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {listeningNow.map((listener, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="relative">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground font-bold">
                        {listener.avatar}
                      </div>
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{listener.name}</p>
                      <p className="text-xs text-muted-foreground">Listening now</p>
                    </div>
                    <Music className="h-4 w-4 text-primary animate-pulse" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Connect Spotify CTA */}
        <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
          <CardContent className="p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#1DB954] mb-3">
              <Music className="h-6 w-6 text-white" />
            </div>
            <h3 className="font-bold mb-2">Connect Your Spotify</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Sync your personal playlists and enjoy full playback control
            </p>
            <Button className="bg-[#1DB954] hover:bg-[#1ed760] text-white">
              Connect Spotify
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
