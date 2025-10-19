import { useState } from 'react';
import { Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MusicPlayerPanel } from './MusicPlayerPanel';

export const MusicPlayer = () => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative group">
          <Music className="h-5 w-5 transition-all group-hover:scale-110" />
          <span className="absolute inset-0 rounded-full bg-primary/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity animate-pulse" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0 border-0 bg-transparent shadow-none">
        <MusicPlayerPanel />
      </PopoverContent>
    </Popover>
  );
};
