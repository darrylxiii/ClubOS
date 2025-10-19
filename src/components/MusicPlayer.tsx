import { useState } from 'react';
import { Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MusicPlayerPanel } from './MusicPlayerPanel';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const MusicPlayer = () => {
  const [open, setOpen] = useState(false);

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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative group">
          <Music className="h-5 w-5 transition-all group-hover:scale-110" />
          {hasLiveSession && (
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 border-2 border-background animate-pulse" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0 border-0 bg-transparent shadow-none">
        <MusicPlayerPanel />
      </PopoverContent>
    </Popover>
  );
};
