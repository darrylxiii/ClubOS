import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PipelineStageProps {
  title: string;
  isActive: boolean;
  isCompleted: boolean;
  isLast?: boolean;
  onClick?: () => void;
}

export const PipelineStage = ({
  title,
  isActive,
  isCompleted,
  isLast = false,
  onClick,
}: PipelineStageProps) => {
  return (
    <div className="flex items-center flex-1">
      <div className="flex flex-col items-center">
        <Button
          variant="ghost"
          className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 p-0 hover:scale-110",
            isCompleted
              ? "bg-success border-success text-success-foreground hover:bg-success/90 shadow-glow"
              : isActive
              ? "bg-accent border-accent text-accent-foreground scale-110 shadow-glow hover:bg-accent/90"
              : "bg-card border-border text-muted-foreground hover:border-accent/50"
          )}
          onClick={onClick}
        >
          {isCompleted ? (
            <Check className="w-5 h-5" />
          ) : (
            <span className="text-sm font-semibold">
              {isActive ? "●" : "○"}
            </span>
          )}
        </Button>
        <p
          className={cn(
            "mt-2 text-xs font-medium text-center max-w-[80px]",
            isActive ? "text-accent font-bold" : "text-muted-foreground"
          )}
        >
          {title}
        </p>
      </div>
      {!isLast && (
        <div
          className={cn(
            "flex-1 h-0.5 mx-2 transition-all duration-300",
            isCompleted ? "bg-gradient-accent" : "bg-border"
          )}
        />
      )}
    </div>
  );
};
