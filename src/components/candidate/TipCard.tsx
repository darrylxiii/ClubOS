import { QuickTip } from "@/types/quickTip";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import * as Icons from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface TipCardProps {
  tip: QuickTip;
  index: number;
}

const categoryLabels: Record<string, string> = {
  career: 'Career Advice',
  interview: 'Interview Tips',
  platform: 'Platform Features',
  insights: 'Market Insights',
  success: 'Success Stories',
};

export function TipCard({ tip, index }: TipCardProps) {
  const navigate = useNavigate();
  const IconComponent = (Icons as any)[tip.icon] || Icons.Sparkles;

  const handleClick = () => {
    if (tip.actionLink) {
      navigate(tip.actionLink);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ scale: 1.02 }}
      className="h-full"
    >
      <Card
        className={cn(
          "h-full p-6 cursor-pointer transition-all duration-300",
          "bg-background/40 backdrop-blur-lg",
          "border border-primary/10 hover:border-primary/50",
          "hover:shadow-lg hover:shadow-primary/20",
          "flex flex-col"
        )}
        onClick={handleClick}
      >
        {/* Header with category and read time */}
        <div className="flex items-center justify-between mb-4">
          <Badge 
            variant="secondary" 
            className={cn(
              "text-xs font-semibold uppercase tracking-wide",
              "bg-gradient-to-r",
              tip.gradient
            )}
          >
            {categoryLabels[tip.category]}
          </Badge>
          <span className="text-xs text-muted-foreground">{tip.readTime}</span>
        </div>

        {/* Icon */}
        <div className="mb-4 flex justify-center">
          <div className={cn(
            "p-4 rounded-full bg-gradient-to-br",
            tip.gradient,
            "animate-pulse"
          )}>
            <IconComponent className="h-8 w-8 text-foreground" />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-foreground mb-2 line-clamp-2">
          {tip.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-3 mb-4 flex-grow">
          {tip.description}
        </p>

        {/* CTA Button */}
        {tip.actionLabel && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full group-hover:bg-primary/10 transition-colors"
          >
            {tip.actionLabel} →
          </Button>
        )}
      </Card>
    </motion.div>
  );
}
