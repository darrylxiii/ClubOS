import { memo } from "react";
import { Button } from "@/components/ui/button";
import { LayoutDashboard } from "lucide-react";

interface JobCardActionsProps {
  onOpenDashboard: () => void;
}

export const JobCardActions = memo(({ onOpenDashboard }: JobCardActionsProps) => {
  return (
    <Button
      variant="glass"
      className="w-full font-semibold"
      onClick={onOpenDashboard}
    >
      <LayoutDashboard className="w-4 h-4 mr-2" />
      Open Job Dashboard
    </Button>
  );
});

JobCardActions.displayName = 'JobCardActions';
