import { CheckCircle2, Clock, Activity, AlertCircle, User, Briefcase, Target, DollarSign, Settings, Lock, Phone, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface OnboardingProgressTrackerProps {
  request: {
    profiles?: {
      onboarding_completed_at?: string | null;
      onboarding_current_step?: number;
      onboarding_partial_data?: any;
      onboarding_last_activity_at?: string | null;
      phone_verified?: boolean;
      email_verified?: boolean;
    };
  };
}

export function OnboardingProgressTracker({ request }: OnboardingProgressTrackerProps) {
  const steps = [
    { 
      id: 1, 
      name: 'Contact', 
      icon: User,
      fields: ['full_name', 'email', 'phone', 'location', 'email_verified', 'phone_verified'] 
    },
    { 
      id: 2, 
      name: 'Professional', 
      icon: Briefcase,
      fields: ['current_title', 'linkedin_url', 'bio', 'resume_url'] 
    },
    { 
      id: 3, 
      name: 'Career', 
      icon: Target,
      fields: ['dream_job_title', 'employment_type', 'notice_period', 'preferred_work_locations'] 
    },
    { 
      id: 4, 
      name: 'Compensation', 
      icon: DollarSign,
      fields: ['current_salary_min', 'desired_salary_min', 'freelance_hourly_rate_min'] 
    },
    { 
      id: 5, 
      name: 'Preferences', 
      icon: Settings,
      fields: ['remote_work_preference'] 
    },
    { 
      id: 6, 
      name: 'Password', 
      icon: Lock,
      fields: [] 
    },
  ];

  const currentStep = request.profiles?.onboarding_current_step || 0;
  const partialData = request.profiles?.onboarding_partial_data || {};
  const lastActivity = request.profiles?.onboarding_last_activity_at;
  const isComplete = !!request.profiles?.onboarding_completed_at;

  const getFieldValue = (field: string) => {
    const value = partialData[field];
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return 'Provided';
    return String(value);
  };

  return (
    <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Onboarding Progress
        </h4>
        {lastActivity && !isComplete && (
          <span className="text-xs text-muted-foreground">
            Last active {formatDistanceToNow(new Date(lastActivity))} ago
          </span>
        )}
      </div>

      {/* Overall Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Progress value={(currentStep / 6) * 100} className="flex-1" />
          <span className="text-sm font-medium">{currentStep}/6</span>
        </div>
        
        {isComplete ? (
          <Badge className="bg-green-600">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        ) : currentStep === 0 ? (
          <Badge variant="outline" className="border-amber-500 text-amber-600">
            <Clock className="w-3 h-3 mr-1" />
            Not Started
          </Badge>
        ) : (
          <Badge variant="outline" className="border-blue-500 text-blue-600">
            <Activity className="w-3 h-3 mr-1" />
            Step {currentStep}/6 In Progress
          </Badge>
        )}
      </div>

      {/* Step-by-Step Timeline */}
      <div className="space-y-2">
        {steps.map((step) => {
          const StepIcon = step.icon;
          const isCurrentStep = step.id === currentStep;
          const isCompleted = step.id < currentStep || isComplete;
          const fieldsCompleted = step.fields.filter(f => getFieldValue(f) !== null).length;
          const totalFields = step.fields.length;

          return (
            <div 
              key={step.id} 
              className={cn(
                "flex items-start gap-3 p-3 rounded-md transition-all",
                isCurrentStep && "bg-primary/10 border border-primary/30 shadow-sm",
                isCompleted && "opacity-60"
              )}
            >
              {/* Icon */}
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                isCompleted && "bg-green-600 text-white",
                isCurrentStep && "bg-primary text-primary-foreground animate-pulse",
                !isCompleted && !isCurrentStep && "bg-muted text-muted-foreground"
              )}>
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <StepIcon className="w-4 h-4" />
                )}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className={cn(
                    "text-sm font-medium",
                    isCurrentStep && "text-primary font-semibold"
                  )}>
                    {step.name}
                  </span>
                  {totalFields > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {fieldsCompleted}/{totalFields} fields
                    </Badge>
                  )}
                </div>
                
                {/* Show provided data */}
                {(isCompleted || isCurrentStep) && totalFields > 0 && (
                  <div className="space-y-1 mt-2">
                    {step.fields.map(field => {
                      const value = getFieldValue(field);
                      return value ? (
                        <div key={field} className="flex items-start gap-1.5 text-xs">
                          <CheckCircle2 className="w-3 h-3 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-muted-foreground truncate">
                            {field.replace(/_/g, ' ')}: <span className="text-foreground">{value.substring(0, 40)}</span>
                          </span>
                        </div>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Warning for Stuck Users */}
      {currentStep > 0 && !isComplete && lastActivity && (
        <>
          {new Date().getTime() - new Date(lastActivity).getTime() > 24 * 60 * 60 * 1000 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                ⚠️ User appears stuck at step {currentStep} for over 24 hours - consider reaching out
              </AlertDescription>
            </Alert>
          )}
        </>
      )}

      {/* Quick Data Summary */}
      {currentStep > 0 && !isComplete && (
        <div className="pt-3 border-t space-y-2">
          <h5 className="text-xs font-semibold text-muted-foreground uppercase">
            Data Collected So Far
          </h5>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {partialData.full_name && (
              <div className="flex items-center gap-1">
                <User className="w-3 h-3 text-muted-foreground" />
                <span className="truncate">{partialData.full_name}</span>
              </div>
            )}
            {partialData.phone && (
              <div className="flex items-center gap-1">
                <Phone className="w-3 h-3 text-muted-foreground" />
                <span className="truncate">{partialData.phone}</span>
              </div>
            )}
            {partialData.location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-muted-foreground" />
                <span className="truncate">{partialData.location}</span>
              </div>
            )}
            {partialData.current_title && (
              <div className="flex items-center gap-1">
                <Briefcase className="w-3 h-3 text-muted-foreground" />
                <span className="truncate">{partialData.current_title}</span>
              </div>
            )}
            {partialData.desired_salary_min && (
              <div className="flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-muted-foreground" />
                <span>€{partialData.desired_salary_min.toLocaleString()}+</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
