import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface PipelineStageProps {
  title: string;
  isActive: boolean;
  isCompleted: boolean;
  isLast?: boolean;
}

export const PipelineStage = ({
  title,
  isActive,
  isCompleted,
  isLast = false,
}: PipelineStageProps) => {
  return (
    <div className="flex items-center flex-1">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
            isCompleted
              ? "bg-success border-success text-success-foreground"
              : isActive
              ? "bg-primary border-primary text-primary-foreground scale-110"
              : "bg-card border-border text-muted-foreground"
          )}
        >
          {isCompleted ? (
            <Check className="w-5 h-5" />
          ) : (
            <span className="text-sm font-semibold">
              {isActive ? "●" : "○"}
            </span>
          )}
        </div>
        <p
          className={cn(
            "mt-2 text-xs font-medium text-center max-w-[80px]",
            isActive ? "text-primary" : "text-muted-foreground"
          )}
        >
          {title}
        </p>
      </div>
      {!isLast && (
        <div
          className={cn(
            "flex-1 h-0.5 mx-2 transition-all duration-300",
            isCompleted ? "bg-success" : "bg-border"
          )}
        />
      )}
    </div>
  );
};
