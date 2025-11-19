import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface JobFormProgressProps {
  currentStep: "idle" | "creating" | "uploading" | "finalizing" | "complete";
  uploadProgress?: number;
}

export const JobFormProgress = ({ currentStep, uploadProgress = 0 }: JobFormProgressProps) => {
  const steps = [
    { id: "creating", label: "Creating job" },
    { id: "uploading", label: "Uploading files" },
    { id: "finalizing", label: "Finalizing" },
  ];

  const getStepStatus = (stepId: string) => {
    const stepIndex = steps.findIndex(s => s.id === stepId);
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    
    if (currentStep === "complete") return "complete";
    if (currentStep === "idle") return "pending";
    if (stepIndex < currentIndex) return "complete";
    if (stepIndex === currentIndex) return "active";
    return "pending";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const status = getStepStatus(step.id);
          
          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full transition-all",
                    status === "complete" && "bg-primary text-primary-foreground",
                    status === "active" && "bg-primary/20 border-2 border-primary",
                    status === "pending" && "bg-muted border-2 border-muted"
                  )}
                >
                  {status === "complete" && <CheckCircle2 className="w-5 h-5" />}
                  {status === "active" && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
                  {status === "pending" && <Circle className="w-5 h-5 text-muted-foreground" />}
                </div>
                <p
                  className={cn(
                    "text-xs mt-2 text-center",
                    status === "active" && "text-foreground font-medium",
                    status === "complete" && "text-muted-foreground",
                    status === "pending" && "text-muted-foreground"
                  )}
                >
                  {step.label}
                </p>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "h-[2px] flex-1 mx-2 transition-all",
                    status === "complete" ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
      
      {currentStep === "uploading" && uploadProgress > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Uploading files...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
