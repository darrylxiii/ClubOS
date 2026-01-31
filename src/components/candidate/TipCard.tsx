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

  // Check if link is a placeholder (resources page doesn't exist yet)
  const isPlaceholder = tip.actionLink?.startsWith('/resources/');
  
  // Only apply colored gradients to Career Advice and Interview Tips
  const shouldUseColoredGradient = tip.category === 'career' || tip.category === 'interview';
  const gradientClass = shouldUseColoredGradient ? tip.gradient : 'from-muted/30 to-muted/10';
  
  const handleClick = () => {
    if (tip.actionLink && !isPlaceholder) {
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
          "h-full p-6 transition-all duration-300",
          "bg-card/90 backdrop-blur-xl",
          "border border-border/50 shadow-sm",
          "flex flex-col",
          !isPlaceholder && "cursor-pointer hover:border-border hover:shadow-md"
        )}
        onClick={handleClick}
      >
        {/* Header with category and read time */}
        <div className="flex items-center justify-between mb-4">
          <Badge 
            variant="secondary" 
            className="text-xs font-semibold uppercase tracking-wide"
          >
            {categoryLabels[tip.category]}
          </Badge>
          <span className="text-xs text-muted-foreground">{tip.readTime}</span>
        </div>

        {/* Icon */}
        <div className="mb-4 flex justify-center">
          <div className={cn(
            "p-4 rounded-full bg-gradient-to-br transition-transform hover:scale-110",
            gradientClass
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
            variant={isPlaceholder ? "outline" : "ghost"}
            size="sm" 
            className={cn(
              "w-full transition-colors",
              isPlaceholder 
                ? "border-muted-foreground/20 text-muted-foreground cursor-not-allowed opacity-60" 
                : "group-hover:bg-primary/10"
            )}
            disabled={isPlaceholder}
          >
            {isPlaceholder ? "In Development" : `${tip.actionLabel} →`}
          </Button>
        )}
      </Card>
    </motion.div>
  );
}
