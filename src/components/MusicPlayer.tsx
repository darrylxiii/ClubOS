import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { motion } from "framer-motion";
import { MusicPlayerPanel } from './MusicPlayerPanel';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const MusicPlayer = () => {
  const { t } = useTranslation('common');
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
    refetchInterval: 120000,
    refetchIntervalInBackground: false,
    staleTime: 60000,
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
            className="relative group rounded-full w-9 h-9 hover:bg-white/10 dark:hover:bg-white/5 transition-all outline-none"
            aria-label={hasLiveSession ? t('musicPlayer.liveSessionActive', 'Music player (live session active)') : t('musicPlayer.title', 'Music player')}
          >
            <motion.div
              whileHover={{ scale: 1.1, rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="relative z-10 flex items-center justify-center w-full h-full"
            >
              <Music className="h-4 w-4 transition-colors group-hover:text-primary" aria-hidden="true" />
            </motion.div>
            
            {hasLiveSession && (
              <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-red-500 border-[1.5px] border-background animate-pulse-glow z-20 pointer-events-none" aria-hidden="true" />
            )}
            
            <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-md pointer-events-none rounded-full" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[380px] p-0 border-0 bg-transparent shadow-none">
          <MusicPlayerPanel audioRef={audioRef} />
        </PopoverContent>
      </Popover>
    </>
  );
};
