import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  X,
  Sparkles,
  Trophy,
} from "lucide-react";
import { Link } from "react-router-dom";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { usePartnerActivation, type ActivationStep } from "@/hooks/usePartnerActivation";
import { Skeleton } from "@/components/ui/skeleton";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { useTranslation } from 'react-i18next';

interface PartnerActivationChecklistProps {
  companyId: string;
}

// ---------------------------------------------------------------------------
// Circular progress ring (SVG)
// ---------------------------------------------------------------------------
function ProgressRing({
  progress,
  size = 56,
  strokeWidth = 4,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      {/* Background track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-border/40"
      />
      {/* Filled arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="url(#activation-gradient)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-[stroke-dashoffset] duration-700 ease-out"
      />
      <defs>
        <linearGradient id="activation-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(var(--primary) / 0.6)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Individual step row
// ---------------------------------------------------------------------------
function StepRow({
  step,
  isNext,
}: {
  step: ActivationStep;
  isNext: boolean;
}) {
  return (
    <div
      className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
        step.completed
          ? "opacity-60"
          : isNext
            ? "bg-primary/[0.04] border border-primary/20"
            : ""
      }`}
    >
      {/* Status icon */}
      <div className="shrink-0">
        {step.completed ? (
          <CheckCircle2 className="h-5 w-5 text-primary" />
        ) : (
          <Circle className={`h-5 w-5 ${isNext ? "text-primary/60" : "text-muted-foreground/40"}`} />
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium leading-tight ${
            step.completed ? "line-through text-muted-foreground" : "text-foreground"
          }`}
        >
          {step.title}
        </p>
        {!step.completed && (
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
            {step.description}
          </p>
        )}
      </div>

      {/* Action */}
      {!step.completed && (
        <Button
          size="sm"
          variant={isNext ? "default" : "outline"}
          className="shrink-0 text-xs h-8"
          asChild
        >
          <Link to={step.actionPath}>
            {step.actionLabel}
            <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function PartnerActivationChecklist({ companyId }: PartnerActivationChecklistProps) {
  const {
  const { t } = useTranslation('clubhome');
    steps,
    progress,
    completedCount,
    totalCount,
    allComplete,
    loading,
    dismissed,
    dismiss,
  } = usePartnerActivation(companyId);

  const [expanded, setExpanded] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);
  const prevCompletedRef = useRef(completedCount);

  // -----------------------------------------------------------------------
  // Celebrate when a NEW step completes (not on first load)
  // -----------------------------------------------------------------------
  const hasHydrated = useRef(false);

  useEffect(() => {
    if (loading) return;

    // Skip celebration on initial mount
    if (!hasHydrated.current) {
      hasHydrated.current = true;
      prevCompletedRef.current = completedCount;
      return;
    }

    if (completedCount > prevCompletedRef.current) {
      // A step was just completed
      if (allComplete) {
        // 🎉 All steps done — big celebration
        setShowCelebration(true);
        confetti({
          particleCount: 200,
          spread: 140,
          origin: { y: 0.4 },
          colors: ["#C9A24E", "#F5F4EF", "#FFD700", "#E8D5A3"],
        });
        toast.success(t("activation_complete", "Activation complete!"), {
          description: t('toast.youreFullySetUpYour', "You're fully set up. Your strategist has everything needed to deliver results."),
          duration: 6000,
        });
      } else {
        // Regular milestone
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 },
          colors: ["#C9A24E", "#F5F4EF"],
        });
        const justCompleted = steps.find(
          (s) => s.completed && !["account_created"].includes(s.id),
        );
        if (justCompleted) {
          toast.success(t("step_completed", "Step completed!"), {
            description: `${justCompleted.title} — nice progress.`,
          });
        }
      }
    }

    prevCompletedRef.current = completedCount;
  }, [completedCount, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Don't render if dismissed or fully complete for 5+ seconds
  if (dismissed) return null;

  if (loading) {
    return (
      <Card className="border-primary/10">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-14 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // -----------------------------------------------------------------------
  // 🏆 All-complete celebration state
  // -----------------------------------------------------------------------
  if (allComplete && showCelebration) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 overflow-hidden">
        <CardContent className="p-6 text-center">
          <Trophy className="h-10 w-10 text-primary mx-auto mb-3" />
          <h3 className="text-lg font-bold mb-1">{t('youreFullyActivated', "You're fully activated")}</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            Your strategist has everything they need to deliver your first shortlist.
            You'll hear from them within 24 hours.
          </p>
          <Button variant="outline" size="sm" onClick={dismiss}>{t('gotIt', 'Got it')}</Button>
        </CardContent>
      </Card>
    );
  }

  // Hide if all complete and celebration already passed
  if (allComplete) return null;

  // Find the first incomplete step — this is the "next" action
  const nextStep = steps.find((s) => !s.completed);

  return (
    <Card className="border-primary/15 bg-card/80 backdrop-blur-[var(--blur-glass-subtle)] overflow-hidden">
      <CardContent className="p-0">
        {/* ────────────────── Header (always visible) ────────────────── */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-4 p-4 sm:p-5 text-left hover:bg-muted/20 transition-colors"
        >
          {/* Circular progress ring with percentage inside */}
          <div className="relative shrink-0">
            <ProgressRing progress={progress} />
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-foreground">
              {progress}%
            </span>
          </div>

          {/* Title + subtitle */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground leading-tight">{t('yourHiringSetup', 'Your Hiring Setup')}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {completedCount} of {totalCount} complete
              {nextStep && (
                <span className="text-foreground/70">
                  {" "}— next: {nextStep.title.toLowerCase()}
                </span>
              )}
            </p>
          </div>

          {/* Collapse toggle */}
          <div className="shrink-0 text-muted-foreground">
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </button>

        {/* ────────────────── Expanded step list ────────────────── */}
        {expanded && (
          <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-1 border-t border-border/30 pt-3">
            {steps.map((step) => (
              <StepRow
                key={step.id}
                step={step}
                isNext={step.id === nextStep?.id}
              />
            ))}

            {/* Micro-footer: dismiss link + social proof */}
            <div className="flex items-center justify-between pt-3 mt-1 border-t border-border/20">
              <p className="text-[11px] text-muted-foreground/60">
                Partners who complete setup get shortlists 2x faster
              </p>
              {completedCount >= 3 && (
                <button
                  type="button"
                  onClick={dismiss}
                  className="text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                >
                  {t('common:dismiss')}
                </button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
