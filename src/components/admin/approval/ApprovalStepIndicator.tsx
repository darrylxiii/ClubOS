import { ApprovalStep } from "@/types/approval";
import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ApprovalStepIndicatorProps {
  currentStep: ApprovalStep;
  completedSteps: ApprovalStep[];
}

const steps: { key: ApprovalStep; label: string }[] = [
  { key: 'review', label: 'Review' },
  { key: 'detect', label: 'Detect' },
  { key: 'merge', label: 'Merge/Create' },
  { key: 'assign', label: 'Assign' },
  { key: 'confirm', label: 'Confirm' },
];

export const ApprovalStepIndicator = ({ currentStep, completedSteps }: ApprovalStepIndicatorProps) => {
  const currentStepIndex = steps.findIndex(s => s.key === currentStep);

  return (
    <div className="flex items-center justify-between w-full mb-8">
      {steps.map((step, index) => {
        const isCompleted = completedSteps.includes(step.key);
        const isCurrent = step.key === currentStep;
        const isUpcoming = index > currentStepIndex;

        return (
          <div key={step.key} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all",
                isCompleted && "bg-primary border-primary text-primary-foreground",
                isCurrent && "border-primary text-primary bg-primary/10",
                isUpcoming && "border-muted-foreground/30 text-muted-foreground"
              )}>
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Circle className="w-5 h-5" />
                )}
              </div>
              <span className={cn(
                "text-xs mt-2 font-medium transition-colors",
                isCurrent && "text-primary",
                isCompleted && "text-primary",
                isUpcoming && "text-muted-foreground"
              )}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={cn(
                "h-0.5 flex-1 transition-colors",
                index < currentStepIndex ? "bg-primary" : "bg-muted-foreground/20"
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
};
