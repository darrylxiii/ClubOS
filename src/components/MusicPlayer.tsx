import { useState } from 'react';
import { Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { MusicPlayerPanel } from './MusicPlayerPanel';

export const MusicPlayer = () => {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative group">
          <Music className="h-5 w-5 transition-all group-hover:scale-110" />
          <span className="absolute inset-0 rounded-full bg-primary/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity animate-pulse" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg p-0">
        <MusicPlayerPanel />
      </SheetContent>
    </Sheet>
  );
};
