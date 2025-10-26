import { motion } from "framer-motion";
import { Target, Calendar, TrendingUp } from "lucide-react";
import { InteractiveCard } from "./InteractiveCard";

interface ResponsibilityGridProps {
  responsibilities?: string[];
}

const getCategoryForResponsibility = (responsibility: string) => {
  const lower = responsibility.toLowerCase();
  
  if (lower.includes('daily') || lower.includes('day-to-day') || lower.includes('regularly')) {
    return { type: 'daily', icon: Calendar, color: 'from-blue-500/20 to-cyan-500/20', border: 'border-blue-500/30' };
  }
  if (lower.includes('weekly') || lower.includes('week') || lower.includes('recurring')) {
    return { type: 'weekly', icon: Calendar, color: 'from-purple-500/20 to-violet-500/20', border: 'border-purple-500/30' };
  }
  if (lower.includes('strategic') || lower.includes('long-term') || lower.includes('planning') || lower.includes('lead')) {
    return { type: 'strategic', icon: TrendingUp, color: 'from-accent/20 to-primary/20', border: 'border-accent/30' };
  }
  
  return { type: 'daily', icon: Target, color: 'from-chart-2/20 to-chart-1/20', border: 'border-chart-2/30' };
};

export function ResponsibilityGrid({ responsibilities = [] }: ResponsibilityGridProps) {
  if (responsibilities.length === 0) return null;

  return (
    <InteractiveCard className="space-y-6">
      <h3 className="text-2xl font-bold flex items-center gap-2">
        <span className="w-2 h-8 bg-gradient-to-b from-primary to-accent rounded-full" />
        Key Responsibilities
      </h3>

      <div className="space-y-3">
        {responsibilities.map((responsibility, index) => {
          const category = getCategoryForResponsibility(responsibility);
          const Icon = category.icon;

          return (
            <div
              key={index}
              className={`flex items-start gap-4 p-4 rounded-lg border-2 ${category.border} bg-gradient-to-r ${category.color} hover:border-primary transition-all group`}
            >
              {/* Number indicator */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br ${category.color} border ${category.border} flex items-center justify-center`}>
                <span className="text-sm font-bold text-foreground">
                  {index + 1}
                </span>
              </div>

              {/* Content */}
              <p className="flex-1 text-foreground leading-relaxed">
                {responsibility}
              </p>

              {/* Category icon */}
              <Icon className="flex-shrink-0 w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          );
        })}
      </div>
    </InteractiveCard>
  );
}
