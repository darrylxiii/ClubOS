import { motion } from "framer-motion";
import { FileText, Video, Users, CheckCircle2, Lightbulb, Clock, ChevronDown } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface TimelineStage {
  name: string;
  icon: any;
  duration: string;
  tip: string;
}

const defaultStages: TimelineStage[] = [
  {
    name: "Application Review",
    icon: FileText,
    duration: "1-2 days",
    tip: "Ensure your profile is complete and highlights relevant experience"
  },
  {
    name: "Screening Call",
    icon: Video,
    duration: "30 minutes",
    tip: "Prepare to discuss your background and motivations"
  },
  {
    name: "Technical Interview",
    icon: Users,
    duration: "1-2 hours",
    tip: "Review job requirements and prepare examples of your work"
  },
  {
    name: "Final Round",
    icon: Users,
    duration: "1 hour",
    tip: "Meet the team and discuss culture fit and expectations"
  },
  {
    name: "Offer",
    icon: CheckCircle2,
    duration: "1-3 days",
    tip: "Review compensation package and negotiate if needed"
  }
];

interface ApplicationTimelineProps {
  stages?: TimelineStage[];
  currentStage?: number;
}

export function ApplicationTimeline({ 
  stages = defaultStages,
  currentStage 
}: ApplicationTimelineProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-2 hover:border-primary transition-all hover-scale">
        <CollapsibleTrigger className="w-full">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 text-left">
                <Clock className="w-6 h-6 text-primary flex-shrink-0" />
                <div>
                  <h3 className="text-xl font-black">Application Process</h3>
                  <p className="text-sm text-muted-foreground">
                    Typical timeline: ~2-3 weeks
                  </p>
                </div>
              </div>
              <ChevronDown
                className={cn(
                  "w-6 h-6 transition-transform flex-shrink-0",
                  isOpen && "rotate-180"
                )}
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="border-t pt-6">
            <div className="relative">
              {/* Vertical connecting line */}
              <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gradient-to-b from-primary via-accent to-chart-2" />

              <div className="space-y-6">
                {stages.map((stage, index) => {
                  const Icon = stage.icon;
                  const isPast = currentStage !== undefined && index < currentStage;
                  const isCurrent = currentStage === index;
                  const isFuture = currentStage !== undefined && index > currentStage;

                  return (
                    <div
                      key={stage.name}
                      className="relative flex gap-6"
                    >
                      {/* Icon circle */}
                      <div
                        className={cn(
                          "relative z-10 flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center border-2",
                          "transition-all duration-300",
                          isPast && "bg-chart-2 border-chart-2",
                          isCurrent && "bg-accent border-accent",
                          isFuture && "bg-muted border-border"
                        )}
                      >
                        <Icon className={cn(
                          "w-6 h-6",
                          isPast && "text-chart-2-foreground",
                          isCurrent && "text-accent-foreground",
                          isFuture && "text-muted-foreground"
                        )} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 pb-6">
                        <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className={cn(
                              "text-base font-semibold",
                              isCurrent && "text-accent"
                            )}>
                              {stage.name}
                              {isCurrent && (
                                <span className="ml-2 px-2 py-0.5 text-xs bg-accent/20 text-accent rounded-full">
                                  Current
                                </span>
                              )}
                            </h4>
                            <span className="text-sm text-muted-foreground whitespace-nowrap ml-4">
                              ~{stage.duration}
                            </span>
                          </div>

                          {/* Tip */}
                          <div className="flex items-start gap-2 p-2 rounded bg-accent/5 border border-accent/20">
                            <Lightbulb className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-muted-foreground">
                              <span className="font-medium text-accent">Tip:</span> {stage.tip}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Average time estimate */}
            <div className="p-3 rounded-lg bg-muted/30 border border-border/50 mt-6">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Average time to hire:</span> 2-3 weeks
              </p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
