import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InterviewRound } from '@/hooks/useInterviewLoop';

interface InterviewLoopConfigProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rounds: InterviewRound[];
  onSave: (rounds: InterviewRound[]) => Promise<void>;
}

export const InterviewLoopConfig = memo(({
  open,
  onOpenChange,
  rounds: initialRounds,
  onSave,
}: InterviewLoopConfigProps) => {
  const { t } = useTranslation('jobDashboard');
  const [rounds, setRounds] = useState<InterviewRound[]>(initialRounds);
  const [saving, setSaving] = useState(false);

  // Reset when dialog opens
  const handleOpenChange = (o: boolean) => {
    if (o) setRounds(initialRounds);
    onOpenChange(o);
  };

  const addRound = () => {
    setRounds([
      ...rounds,
      {
        name: `Round ${rounds.length + 1}`,
        interviewerIds: [],
        durationMinutes: 30,
      },
    ]);
  };

  const updateRound = (index: number, updates: Partial<InterviewRound>) => {
    setRounds(rounds.map((r, i) => (i === index ? { ...r, ...updates } : r)));
  };

  const removeRound = (index: number) => {
    setRounds(rounds.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(rounds);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t('interviewLoop.title', 'Interview Loop Configuration')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {rounds.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              {t('interviewLoop.empty', 'No interview rounds configured. Add your first round.')}
            </p>
          ) : (
            rounds.map((round, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-lg border border-border/30 bg-muted/10"
              >
                <div className="mt-2 text-muted-foreground/40">
                  <GripVertical className="w-4 h-4" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground w-6 shrink-0">
                      {i + 1}.
                    </span>
                    <Input
                      value={round.name}
                      onChange={(e) => updateRound(i, { name: e.target.value })}
                      className="h-7 text-xs flex-1"
                      placeholder={t('interviewLoop.roundName', 'Round name')}
                    />
                  </div>
                  <div className="flex items-center gap-2 pl-8">
                    <Label className="text-[10px] text-muted-foreground shrink-0">
                      {t('interviewLoop.duration', 'Duration')}
                    </Label>
                    <Input
                      type="number"
                      value={round.durationMinutes}
                      onChange={(e) =>
                        updateRound(i, { durationMinutes: parseInt(e.target.value) || 30 })
                      }
                      className="h-7 text-xs w-20"
                      min={15}
                      max={480}
                    />
                    <span className="text-[10px] text-muted-foreground">min</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0 mt-0.5"
                  onClick={() => removeRound(i)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))
          )}

          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 text-xs"
            onClick={addRound}
          >
            <Plus className="w-3.5 h-3.5" />
            {t('interviewLoop.addRound', 'Add Round')}
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving
              ? t('common.saving', 'Saving...')
              : t('common.save', 'Save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

InterviewLoopConfig.displayName = 'InterviewLoopConfig';
