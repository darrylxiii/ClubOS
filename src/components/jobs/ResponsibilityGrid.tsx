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
    <div className="space-y-6">
      <motion.h3 
        className="text-2xl font-bold flex items-center gap-2"
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
      >
        <span className="w-2 h-8 bg-gradient-to-b from-primary to-accent rounded-full" />
        Key Responsibilities
      </motion.h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {responsibilities.map((responsibility, index) => {
          const category = getCategoryForResponsibility(responsibility);
          const Icon = category.icon;

          return (
            <InteractiveCard
              key={index}
              delay={index * 0.05}
              className="relative overflow-hidden group"
            >
              <div className="flex items-start gap-4">
                {/* Number indicator */}
                <motion.div
                  className={`flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br ${category.color} border ${category.border} flex items-center justify-center`}
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 200, 
                    delay: index * 0.05 
                  }}
                >
                  <span className="text-sm font-bold text-foreground">
                    {index + 1}
                  </span>
                </motion.div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-foreground leading-relaxed group-hover:text-accent transition-colors">
                    {responsibility}
                  </p>
                </div>

                {/* Category icon */}
                <motion.div
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  initial={{ rotate: -90, scale: 0 }}
                  whileInView={{ rotate: 0, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 + 0.2 }}
                >
                  <Icon className="w-5 h-5 text-muted-foreground" />
                </motion.div>
              </div>

              {/* Connecting line (decorative) */}
              {index < responsibilities.length - 1 && (
                <motion.div
                  className="absolute -bottom-2 left-5 w-0.5 h-4 bg-gradient-to-b from-border to-transparent"
                  initial={{ scaleY: 0 }}
                  whileInView={{ scaleY: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 + 0.3 }}
                />
              )}
            </InteractiveCard>
          );
        })}
      </div>
    </div>
  );
}
