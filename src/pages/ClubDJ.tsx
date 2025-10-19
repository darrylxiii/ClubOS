import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useRole } from "@/contexts/RoleContext";
import { Loader2, Music2, Radio, Upload } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlaylistManager } from "@/components/club-dj/PlaylistManager";
import { TrackUploader } from "@/components/club-dj/TrackUploader";
import { DJMixer } from "@/components/club-dj/DJMixer";
import { TrackList } from "@/components/club-dj/TrackList";

export default function ClubDJ() {
  const { currentRole, loading } = useRole();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("playlists");

  useEffect(() => {
    if (!loading && currentRole && currentRole !== 'admin') {
      console.log('[ClubDJ] Redirecting non-admin user:', currentRole);
      navigate('/home');
    }
  }, [currentRole, loading, navigate]);

  if (loading || !currentRole) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (currentRole !== 'admin') {
    console.log('[ClubDJ] Non-admin role detected:', currentRole);
    return null;
  }

  return (
    <AppLayout>
      <div className="container max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 backdrop-blur-sm border border-primary/20">
              <Radio className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Club DJ Dashboard
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage playlists, upload tracks, and DJ live for The Quantum Club Radio
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3 bg-black/20 backdrop-blur-xl border border-white/10 p-1">
            <TabsTrigger 
              value="playlists" 
              className="data-[state=active]:bg-white data-[state=active]:text-black"
            >
              <Music2 className="h-4 w-4 mr-2" />
              Playlists
            </TabsTrigger>
            <TabsTrigger 
              value="upload"
              className="data-[state=active]:bg-white data-[state=active]:text-black"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </TabsTrigger>
            <TabsTrigger 
              value="mixer"
              className="data-[state=active]:bg-white data-[state=active]:text-black"
            >
              <Radio className="h-4 w-4 mr-2" />
              DJ Mixer
            </TabsTrigger>
          </TabsList>

          <TabsContent value="playlists" className="mt-6">
            <PlaylistManager />
          </TabsContent>

            <TabsContent value="upload" className="mt-6 space-y-8">
              <TrackUploader />
              <TrackList />
            </TabsContent>

          <TabsContent value="mixer" className="mt-6">
            <DJMixer />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
