import { useState, useRef } from 'react';
import { Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MusicPlayerPanel } from './MusicPlayerPanel';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const MusicPlayer = () => {
  const [open, setOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Check if there's an active live session
  const { data: hasLiveSession } = useQuery({
    queryKey: ['has-live-session'],
    queryFn: async () => {
      const { count } = await supabase
        .from('live_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      
      return (count || 0) > 0;
    },
    refetchInterval: 5000,
  });

  return (
    <>
      {/* Persistent audio element - stays mounted even when popover closes */}
      <audio 
        ref={audioRef}
        onTimeUpdate={(e) => {
          // Progress updates handled by panel
          const audio = e.currentTarget;
          audio.dataset.progress = audio.duration 
            ? String((audio.currentTime / audio.duration) * 100)
            : '0';
        }}
        className="hidden" 
      />
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative group"
            aria-label={hasLiveSession ? "Music player (live session active)" : "Music player"}
          >
            <Music className="h-5 w-5 transition-all group-hover:scale-110" aria-hidden="true" />
            {hasLiveSession && (
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 border-2 border-background animate-pulse" aria-hidden="true" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[380px] p-0 border-0 bg-transparent shadow-none">
          <MusicPlayerPanel audioRef={audioRef} />
        </PopoverContent>
      </Popover>
    </>
  );
};
