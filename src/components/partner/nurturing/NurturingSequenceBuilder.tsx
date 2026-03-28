import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Workflow,
  Zap,
  Mail,
  ListPlus,
  BellRing,
  Clock,
  UserPlus,
  Briefcase,
  ArrowDown,
  Save,
  Trash2,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ── Types ──────────────────────────────────────────────────────────

interface SequenceStep {
  id: string;
  type: 'trigger' | 'action';
  value: string;
  label: string;
}

interface SavedSequence {
  id: string;
  steps: SequenceStep[];
  createdAt: string;
}

const STORAGE_KEY = 'clubos_nurturing_sequences';

// ── Trigger & Action options ───────────────────────────────────────

const TRIGGER_OPTIONS = [
  { value: '30_days_after_rejection', labelKey: 'nurturing.builder.trigger30Days', fallback: '30 days after rejection', icon: Clock },
  { value: 'profile_updated', labelKey: 'nurturing.builder.triggerProfileUpdated', fallback: 'Profile updated', icon: UserPlus },
  { value: 'new_role_matching', labelKey: 'nurturing.builder.triggerNewRole', fallback: 'New role posted matching skills', icon: Briefcase },
] as const;

const ACTION_OPTIONS = [
  { value: 'send_email', labelKey: 'nurturing.builder.actionSendEmail', fallback: 'Send personalized email', icon: Mail },
  { value: 'add_to_shortlist', labelKey: 'nurturing.builder.actionAddShortlist', fallback: 'Add to shortlist', icon: ListPlus },
  { value: 'notify_strategist', labelKey: 'nurturing.builder.actionNotifyStrategist', fallback: 'Notify strategist', icon: BellRing },
] as const;

// ── Helpers ─────────────────────────────────────────────────────────

function loadSequences(): SavedSequence[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSequences(sequences: SavedSequence[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sequences));
  } catch (err) {
    console.error('[NurturingSequenceBuilder] Save error:', err);
  }
}

// ── Component ───────────────────────────────────────────────────────

interface NurturingSequenceBuilderProps {
  className?: string;
}

export function NurturingSequenceBuilder({ className }: NurturingSequenceBuilderProps) {
  const { t } = useTranslation('partner');

  const [selectedTrigger, setSelectedTrigger] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [steps, setSteps] = useState<SequenceStep[]>([]);
  const [saved, setSaved] = useState<SavedSequence[]>(() => loadSequences());

  const triggerOption = TRIGGER_OPTIONS.find((o) => o.value === selectedTrigger);
  const actionOption = ACTION_OPTIONS.find((o) => o.value === selectedAction);

  const handleAddTrigger = useCallback(() => {
    if (!triggerOption) return;
    const step: SequenceStep = {
      id: `trigger-${Date.now()}`,
      type: 'trigger',
      value: triggerOption.value,
      label: t(triggerOption.labelKey, triggerOption.fallback),
    };
    setSteps((prev) => [...prev, step]);
    setSelectedTrigger('');
  }, [triggerOption, t]);

  const handleAddAction = useCallback(() => {
    if (!actionOption) return;
    const step: SequenceStep = {
      id: `action-${Date.now()}`,
      type: 'action',
      value: actionOption.value,
      label: t(actionOption.labelKey, actionOption.fallback),
    };
    setSteps((prev) => [...prev, step]);
    setSelectedAction('');
  }, [actionOption, t]);

  const handleRemoveStep = useCallback((id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handleSave = useCallback(() => {
    if (steps.length === 0) return;
    const sequence: SavedSequence = {
      id: `seq-${Date.now()}`,
      steps: [...steps],
      createdAt: new Date().toISOString(),
    };
    const updated = [...saved, sequence];
    setSaved(updated);
    saveSequences(updated);
    setSteps([]);
    toast.success(t('nurturing.builder.saved', 'Nurturing sequence saved'));
  }, [steps, saved, t]);

  const handleDeleteSequence = useCallback(
    (id: string) => {
      const updated = saved.filter((s) => s.id !== id);
      setSaved(updated);
      saveSequences(updated);
      toast.success(t('nurturing.builder.deleted', 'Sequence deleted'));
    },
    [saved, t],
  );

  return (
    <div className={cn('space-y-5', className)}>
      {/* Header */}
      <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Workflow className="h-4 w-4" />
        {t('nurturing.builder.title', 'Sequence Builder')}
      </h3>

      {/* Step 1: Trigger */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">
          {t('nurturing.builder.step1', 'Step 1: Select trigger')}
        </p>
        <div className="flex items-center gap-2">
          <Select value={selectedTrigger} onValueChange={setSelectedTrigger}>
            <SelectTrigger className="h-8 flex-1 text-xs bg-card/30 border-border/20">
              <SelectValue placeholder={t('nurturing.builder.chooseTrigger', 'Choose trigger...')} />
            </SelectTrigger>
            <SelectContent>
              {TRIGGER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {t(opt.labelKey, opt.fallback)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1"
            disabled={!selectedTrigger}
            onClick={handleAddTrigger}
          >
            <Plus className="h-3 w-3" />
            {t('nurturing.builder.add', 'Add')}
          </Button>
        </div>
      </div>

      {/* Step 2: Action */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">
          {t('nurturing.builder.step2', 'Step 2: Select action')}
        </p>
        <div className="flex items-center gap-2">
          <Select value={selectedAction} onValueChange={setSelectedAction}>
            <SelectTrigger className="h-8 flex-1 text-xs bg-card/30 border-border/20">
              <SelectValue placeholder={t('nurturing.builder.chooseAction', 'Choose action...')} />
            </SelectTrigger>
            <SelectContent>
              {ACTION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {t(opt.labelKey, opt.fallback)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1"
            disabled={!selectedAction}
            onClick={handleAddAction}
          >
            <Plus className="h-3 w-3" />
            {t('nurturing.builder.add', 'Add')}
          </Button>
        </div>
      </div>

      {/* Step 3: Preview flow */}
      {steps.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            {t('nurturing.builder.step3', 'Step 3: Preview sequence')}
          </p>
          <div className="relative pl-4">
            {/* Vertical connecting line */}
            <div className="absolute left-[22px] top-3 bottom-3 w-px bg-border/50" />

            <AnimatePresence mode="popLayout">
              {steps.map((step, idx) => {
                const isTrigger = step.type === 'trigger';
                const Icon = isTrigger ? Zap : Mail;
                return (
                  <motion.div
                    key={step.id}
                    layout
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ delay: idx * 0.03, duration: 0.2 }}
                    className="relative flex items-center gap-3 py-2"
                  >
                    <div
                      className={cn(
                        'relative z-10 flex items-center justify-center w-[26px] h-[26px] rounded-full shrink-0 border',
                        isTrigger
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                          : 'bg-primary/10 border-primary/30 text-primary',
                      )}
                    >
                      <Icon className="h-3 w-3" />
                    </div>
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <Badge
                        variant={isTrigger ? 'outline' : 'secondary'}
                        className="text-[10px] shrink-0"
                      >
                        {isTrigger
                          ? t('nurturing.builder.trigger', 'Trigger')
                          : t('nurturing.builder.action', 'Action')}
                      </Badge>
                      <span className="text-xs truncate">{step.label}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveStep(step.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Save button */}
          <Button
            size="sm"
            className="w-full h-8 text-xs gap-1.5 mt-2"
            onClick={handleSave}
          >
            <Save className="h-3 w-3" />
            {t('nurturing.builder.save', 'Save Sequence')}
          </Button>
        </div>
      )}

      {/* Saved sequences */}
      {saved.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-border/20">
          <p className="text-xs font-medium text-muted-foreground">
            {t('nurturing.builder.savedSequences', 'Saved Sequences')}
          </p>
          {saved.map((seq) => (
            <div
              key={seq.id}
              className="flex items-center justify-between gap-2 p-2 rounded-lg bg-card/20 border border-border/10"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                {seq.steps.map((step, i) => (
                  <span key={step.id} className="flex items-center gap-1 text-[10px]">
                    {i > 0 && <ArrowDown className="h-2.5 w-2.5 text-muted-foreground" />}
                    <Badge
                      variant={step.type === 'trigger' ? 'outline' : 'secondary'}
                      className="text-[9px] px-1 py-0"
                    >
                      {step.label}
                    </Badge>
                  </span>
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => handleDeleteSequence(seq.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
