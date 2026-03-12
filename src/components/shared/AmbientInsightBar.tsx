import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAmbientInsights, AmbientInsight } from "@/hooks/useAmbientInsights";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, AlertTriangle, Clock, Users, Target, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const iconMap = {
  alert: AlertTriangle,
  clock: Clock,
  users: Users,
  target: Target,
  calendar: Calendar,
};

export function AmbientInsightBar() {
  const { insights, dismiss } = useAmbientInsights();
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigate = useNavigate();

  if (insights.length === 0) return null;

  const current = insights[Math.min(currentIndex, insights.length - 1)];
  if (!current) return null;

  const Icon = iconMap[current.icon] || AlertTriangle;

  const handleAction = () => {
    navigate(current.actionPath);
  };

  const handleDismiss = () => {
    dismiss(current);
    if (currentIndex >= insights.length - 1) {
      setCurrentIndex(Math.max(0, currentIndex - 1));
    }
  };

  const handlePrev = () => setCurrentIndex((i) => Math.max(0, i - 1));
  const handleNext = () => setCurrentIndex((i) => Math.min(insights.length - 1, i + 1));

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={current.id}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25 }}
        className={cn(
          "mx-4 sm:mx-6 mt-2 mb-0 rounded-lg border border-border/40",
          "bg-card/60 backdrop-blur-sm shadow-sm",
          "flex items-center gap-3 px-4 py-2.5"
        )}
      >
        {/* Icon */}
        <div className="shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>

        {/* Message */}
        <p className="flex-1 text-sm text-foreground/90 truncate">
          {current.message}
        </p>

        {/* Navigation arrows */}
        {insights.length > 1 && (
          <div className="hidden sm:flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handlePrev}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {currentIndex + 1}/{insights.length}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleNext}
              disabled={currentIndex >= insights.length - 1}
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Action button */}
        <Button
          variant="secondary"
          size="sm"
          className="shrink-0 h-7 text-xs"
          onClick={handleAction}
        >
          {current.actionLabel}
        </Button>

        {/* Dismiss */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={handleDismiss}
        >
          <X className="h-3 w-3" />
        </Button>
      </motion.div>
    </AnimatePresence>
  );
}