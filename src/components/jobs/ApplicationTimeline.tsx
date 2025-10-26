import { motion } from "framer-motion";
import { FileText, Video, Users, CheckCircle2, Lightbulb } from "lucide-react";
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
  return (
    <div className="space-y-6">
      <motion.h3 
        className="text-2xl font-bold flex items-center gap-2"
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
      >
        <span className="w-2 h-8 bg-gradient-to-b from-primary to-accent rounded-full" />
        Application Process
      </motion.h3>

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
              <motion.div
                key={stage.name}
                className="relative flex gap-6"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                {/* Icon circle */}
                <motion.div
                  className={cn(
                    "relative z-10 flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center border-2",
                    "transition-all duration-300",
                    isPast && "bg-chart-2 border-chart-2 shadow-[0_0_20px_hsl(var(--chart-2)/0.4)]",
                    isCurrent && "bg-accent border-accent shadow-[0_0_20px_hsl(var(--accent)/0.4)] animate-pulse",
                    isFuture && "bg-muted border-border"
                  )}
                  whileHover={{ scale: 1.1 }}
                >
                  <Icon className={cn(
                    "w-6 h-6",
                    isPast && "text-chart-2-foreground",
                    isCurrent && "text-accent-foreground",
                    isFuture && "text-muted-foreground"
                  )} />
                </motion.div>

                {/* Content */}
                <div className="flex-1 pb-6">
                  <div className="glass-card p-5 rounded-xl border border-border/50">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className={cn(
                        "text-lg font-semibold",
                        isCurrent && "text-accent"
                      )}>
                        {stage.name}
                        {isCurrent && (
                          <span className="ml-2 px-2 py-0.5 text-xs bg-accent/20 text-accent rounded-full">
                            You are here
                          </span>
                        )}
                      </h4>
                      <span className="text-sm text-muted-foreground whitespace-nowrap ml-4">
                        ~{stage.duration}
                      </span>
                    </div>

                    {/* QUIN Tip */}
                    <motion.div
                      className="flex items-start gap-2 p-3 rounded-lg bg-accent/5 border border-accent/20"
                      initial={{ opacity: 0, height: 0 }}
                      whileInView={{ opacity: 1, height: "auto" }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 + 0.2 }}
                    >
                      <Lightbulb className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-accent">QUIN Tip:</span>{" "}
                        {stage.tip}
                      </p>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Average time estimate */}
      <motion.div
        className="p-4 rounded-lg bg-muted/30 border border-border/50"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Average time to hire:</span> 2-3 weeks
        </p>
      </motion.div>
    </div>
  );
}
