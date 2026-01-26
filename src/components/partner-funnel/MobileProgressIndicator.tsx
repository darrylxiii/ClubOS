import { cn } from "@/lib/utils";
import { CheckCircle } from "lucide-react";

interface MobileProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
}

export function MobileProgressIndicator({
  currentStep,
  totalSteps,
  stepLabels,
}: MobileProgressIndicatorProps) {
  return (
    <div className="md:hidden mb-6">
      {/* Dots indicator for mobile */}
      <div className="flex items-center justify-center gap-2 mb-3">
        {Array.from({ length: totalSteps }).map((_, index) => (
          <div
            key={index}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              index === currentStep
                ? "w-8 bg-primary"
                : index < currentStep
                ? "w-2 bg-primary"
                : "w-2 bg-muted"
            )}
          />
        ))}
      </div>
      
      {/* Current step label */}
      <div className="text-center">
        <span className="text-sm font-medium capitalize">
          {stepLabels[currentStep]}
        </span>
        <span className="text-xs text-muted-foreground ml-2">
          ({currentStep + 1}/{totalSteps})
        </span>
      </div>
    </div>
  );
}

interface DesktopProgressStepsProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
}

export function DesktopProgressSteps({
  currentStep,
  totalSteps,
  stepLabels,
}: DesktopProgressStepsProps) {
  return (
    <div className="hidden md:flex items-center justify-between mb-8">
      {stepLabels.map((label, index) => (
        <div key={index} className="flex items-center">
          {/* Step circle */}
          <div
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
              index < currentStep
                ? "bg-primary border-primary text-primary-foreground"
                : index === currentStep
                ? "border-primary text-primary bg-primary/10"
                : "border-muted text-muted-foreground"
            )}
          >
            {index < currentStep ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <span className="text-sm font-semibold">{index + 1}</span>
            )}
          </div>
          
          {/* Step label */}
          <span
            className={cn(
              "ml-2 text-sm font-medium capitalize hidden lg:inline",
              index === currentStep
                ? "text-foreground"
                : index < currentStep
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            {label}
          </span>
          
          {/* Connector line */}
          {index < totalSteps - 1 && (
            <div
              className={cn(
                "w-8 lg:w-16 h-0.5 mx-2 transition-all duration-300",
                index < currentStep ? "bg-primary" : "bg-muted"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
