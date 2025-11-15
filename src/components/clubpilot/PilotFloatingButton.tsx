import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileSheet } from "@/components/ui/mobile-sheet";
import { PilotDashboard } from "./PilotDashboard";
import { cn } from "@/lib/utils";

export const PilotFloatingButton = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating Action Button */}
      <Button
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-40",
          "h-14 w-14 rounded-full shadow-lg",
          "bg-primary hover:bg-primary/90",
          "hover:scale-110 transition-transform",
          "animate-in fade-in slide-in-from-bottom-4 duration-300"
        )}
        size="icon"
        aria-label="Open Club Pilot"
      >
        <Sparkles className="h-6 w-6" />
      </Button>

      {/* Pilot Dashboard Sheet */}
      <MobileSheet
        open={open}
        onOpenChange={setOpen}
        title="Club Pilot"
        description="AI-powered task orchestration"
      >
        <div className="h-[calc(100vh-8rem)] overflow-y-auto">
          <PilotDashboard />
        </div>
      </MobileSheet>
    </>
  );
};
