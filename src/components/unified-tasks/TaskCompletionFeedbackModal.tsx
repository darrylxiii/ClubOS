import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, Star, Sparkles } from "lucide-react";

const TIME_PRESETS = [
  { label: "< 15 min", value: 10 },
  { label: "15–30 min", value: 22 },
  { label: "30–60 min", value: 45 },
  { label: "1–2 hrs", value: 90 },
  { label: "2+ hrs", value: 150 },
] as const;

const BLOCKER_OPTIONS = [
  "Waiting on others",
  "Unclear requirements",
  "Tool issues",
  "Scope creep",
  "None",
] as const;

const IMPROVEMENT_OPTIONS = [
  "Better brief",
  "More time",
  "Right tools",
  "Delegation",
  "Training",
] as const;

function getDifficultyMeta(value: number) {
  if (value <= 3) return { label: "Straightforward", className: "text-emerald-400" };
  if (value <= 6) return { label: "Moderate", className: "text-amber-400" };
  if (value <= 9) return { label: "Challenging", className: "text-red-400" };
  return { label: "Extreme", className: "text-red-600" };
}

interface TaskCompletionFeedbackModalProps {
  open: boolean;
  taskTitle: string;
  onSubmit: (feedback: {
    time_spent_minutes: number;
    difficulty_rating: number;
    outcome_rating: number | null;
    blockers: string[] | null;
    improvement_suggestions: string[] | null;
    notes: string | null;
    skipped: boolean;
  }) => void;
  onClose: () => void;
}

export function TaskCompletionFeedbackModal({
  open,
  taskTitle,
  onSubmit,
  onClose,
}: TaskCompletionFeedbackModalProps) {
  const [timeSpent, setTimeSpent] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState(5);
  const [showOptional, setShowOptional] = useState(false);
  const [outcomeRating, setOutcomeRating] = useState<number | null>(null);
  const [blockers, setBlockers] = useState<string[]>([]);
  const [improvements, setImprovements] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const diffMeta = getDifficultyMeta(difficulty);

  const handleSubmit = async () => {
    if (timeSpent === null) return;
    setSubmitting(true);
    await onSubmit({
      time_spent_minutes: timeSpent,
      difficulty_rating: difficulty,
      outcome_rating: outcomeRating,
      blockers: blockers.length > 0 ? blockers : null,
      improvement_suggestions: improvements.length > 0 ? improvements : null,
      notes: notes.trim() || null,
      skipped: false,
    });
    resetState();
  };

  const handleSkip = async () => {
    setSubmitting(true);
    await onSubmit({
      time_spent_minutes: 0,
      difficulty_rating: 0,
      outcome_rating: null,
      blockers: null,
      improvement_suggestions: null,
      notes: null,
      skipped: true,
    });
    resetState();
  };

  const resetState = () => {
    setTimeSpent(null);
    setDifficulty(5);
    setShowOptional(false);
    setOutcomeRating(null);
    setBlockers([]);
    setImprovements([]);
    setNotes("");
    setSubmitting(false);
  };

  const toggleChip = (list: string[], setter: (v: string[]) => void, value: string) => {
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Task Debrief
          </DialogTitle>
          <DialogDescription className="truncate">
            Completing: {taskTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Time spent */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Time spent</label>
            <div className="flex flex-wrap gap-2">
              {TIME_PRESETS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setTimeSpent(p.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
                    timeSpent === p.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 border-border hover:bg-muted text-foreground",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Difficulty</label>
              <span className={cn("text-xs font-medium", diffMeta.className)}>
                {difficulty}/10 — {diffMeta.label}
              </span>
            </div>
            <Slider
              value={[difficulty]}
              onValueChange={([v]) => setDifficulty(v)}
              min={1}
              max={10}
              step={1}
              className="py-1"
            />
          </div>

          {/* Optional section */}
          <button
            onClick={() => setShowOptional(!showOptional)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showOptional ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {showOptional ? "Hide details" : "Add more detail (optional)"}
          </button>

          {showOptional && (
            <div className="space-y-4 animate-in fade-in-0 slide-in-from-top-2 duration-200">
              {/* Outcome quality */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Outcome quality</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setOutcomeRating(outcomeRating === star ? null : star)}
                      className="transition-colors"
                    >
                      <Star
                        className={cn(
                          "h-5 w-5",
                          outcomeRating && star <= outcomeRating
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground/30",
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Blockers */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Blockers encountered</label>
                <div className="flex flex-wrap gap-1.5">
                  {BLOCKER_OPTIONS.map((b) => (
                    <Badge
                      key={b}
                      variant={blockers.includes(b) ? "default" : "outline"}
                      className="cursor-pointer text-xs"
                      onClick={() => toggleChip(blockers, setBlockers, b)}
                    >
                      {b}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Improvements */}
              <div className="space-y-2">
                <label className="text-sm font-medium">What would help next time?</label>
                <div className="flex flex-wrap gap-1.5">
                  {IMPROVEMENT_OPTIONS.map((i) => (
                    <Badge
                      key={i}
                      variant={improvements.includes(i) ? "default" : "outline"}
                      className="cursor-pointer text-xs"
                      onClick={() => toggleChip(improvements, setImprovements, i)}
                    >
                      {i}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Notes</label>
                <Input
                  placeholder="Any context to capture..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            disabled={submitting}
            className="text-muted-foreground text-xs"
          >
            Skip Feedback
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || timeSpent === null}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Complete Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
