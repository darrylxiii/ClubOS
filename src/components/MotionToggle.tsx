import { Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMotion } from "@/contexts/MotionContext";

export const MotionToggle = () => {
  const { motionEnabled, toggleMotion } = useMotion();

  return (
    <Button 
      variant="ghost" 
      size="icon"
      onClick={toggleMotion}
      className="relative group"
      title={motionEnabled ? "Pause motion" : "Play motion"}
    >
      {motionEnabled ? (
        <Pause className="h-5 w-5 transition-all group-hover:scale-110" />
      ) : (
        <Play className="h-5 w-5 transition-all group-hover:scale-110" />
      )}
    </Button>
  );
};
