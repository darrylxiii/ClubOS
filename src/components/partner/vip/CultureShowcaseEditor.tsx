import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Save,
  Plus,
  X,
  Sparkles,
  Heart,
  Globe,
  Users,
  Lightbulb,
  Rocket,
  Coffee,
  Trophy,
  Leaf,
  Shield,
  Palette,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface CultureHighlight {
  icon: string;
  text: string;
}

interface CultureShowcaseEditorProps {
  companyId: string;
  initialDescription: string;
  initialHighlights: CultureHighlight[];
  className?: string;
}

const ICON_OPTIONS: { name: string; icon: LucideIcon }[] = [
  { name: 'heart', icon: Heart },
  { name: 'globe', icon: Globe },
  { name: 'users', icon: Users },
  { name: 'lightbulb', icon: Lightbulb },
  { name: 'rocket', icon: Rocket },
  { name: 'coffee', icon: Coffee },
  { name: 'trophy', icon: Trophy },
  { name: 'leaf', icon: Leaf },
  { name: 'shield', icon: Shield },
  { name: 'sparkles', icon: Sparkles },
  { name: 'palette', icon: Palette },
];

function getIconComponent(name: string): LucideIcon {
  return ICON_OPTIONS.find((o) => o.name === name)?.icon ?? Sparkles;
}

const MAX_HIGHLIGHTS = 5;

export function CultureShowcaseEditor({
  companyId,
  initialDescription,
  initialHighlights,
  className,
}: CultureShowcaseEditorProps) {
  const { t } = useTranslation('partner');
  const [description, setDescription] = useState(initialDescription);
  const [highlights, setHighlights] = useState<CultureHighlight[]>(
    initialHighlights.length > 0 ? initialHighlights : [],
  );
  const [saving, setSaving] = useState(false);

  const addHighlight = () => {
    if (highlights.length >= MAX_HIGHLIGHTS) return;
    setHighlights([...highlights, { icon: 'sparkles', text: '' }]);
  };

  const removeHighlight = (index: number) => {
    setHighlights(highlights.filter((_, i) => i !== index));
  };

  const updateHighlight = (index: number, field: 'icon' | 'text', value: string) => {
    const updated = [...highlights];
    updated[index] = { ...updated[index], [field]: value };
    setHighlights(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save description to companies table
      const { error: descError } = await supabase
        .from('companies')
        .update({
          description,
          metadata: {
            culture_highlights: highlights.filter((h) => h.text.trim()),
          },
        })
        .eq('id', companyId);

      if (descError) throw descError;

      toast.success(t('vip.culture.savedSuccess', 'Culture content saved'));
    } catch (err) {
      console.error('Error saving culture content:', err);
      toast.error(t('vip.culture.savedError', 'Failed to save culture content'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'glass-card rounded-xl border border-border/20 overflow-hidden',
        className,
      )}
    >
      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-semibold">
            {t('vip.culture.title', 'Culture Showcase')}
          </span>
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
          <Save className="h-3.5 w-3.5" />
          {saving
            ? t('vip.culture.saving', 'Saving...')
            : t('vip.culture.save', 'Save')}
        </Button>
      </div>

      <div className="px-5 pb-5 space-y-4">
        {/* Description textarea */}
        <div className="space-y-1.5">
          <Label className="text-xs">
            {t('vip.culture.descriptionLabel', 'About your culture')}
          </Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t(
              'vip.culture.descriptionPlaceholder',
              'Describe what makes your company a great place to work...',
            )}
            rows={4}
            className="resize-none text-sm"
          />
        </div>

        {/* Highlights */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">
              {t('vip.culture.highlightsLabel', 'Culture highlights')} ({highlights.length}/{MAX_HIGHLIGHTS})
            </Label>
            {highlights.length < MAX_HIGHLIGHTS && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={addHighlight}
              >
                <Plus className="h-3 w-3" />
                {t('vip.culture.addHighlight', 'Add')}
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {highlights.map((hl, idx) => {
              const SelectedIcon = getIconComponent(hl.icon);
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2"
                >
                  {/* Icon picker (simple dropdown-like row) */}
                  <div className="flex gap-0.5 shrink-0 p-1 rounded-lg border border-border/30 bg-muted/20">
                    {ICON_OPTIONS.slice(0, 6).map((opt) => {
                      const Ico = opt.icon;
                      return (
                        <button
                          key={opt.name}
                          type="button"
                          onClick={() => updateHighlight(idx, 'icon', opt.name)}
                          className={cn(
                            'p-1 rounded transition-colors',
                            hl.icon === opt.name
                              ? 'bg-primary/20 text-primary'
                              : 'text-muted-foreground hover:text-foreground',
                          )}
                        >
                          <Ico className="h-3.5 w-3.5" />
                        </button>
                      );
                    })}
                  </div>

                  {/* Text */}
                  <Input
                    value={hl.text}
                    onChange={(e) => updateHighlight(idx, 'text', e.target.value)}
                    placeholder={t('vip.culture.highlightPlaceholder', 'e.g. Flexible remote work')}
                    className="flex-1 h-8 text-sm"
                  />

                  {/* Remove */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeHighlight(idx)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Live preview */}
        {(description || highlights.some((h) => h.text.trim())) && (
          <div className="border-t border-border/20 pt-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
              {t('vip.culture.preview', 'Preview')}
            </p>
            <div className="rounded-lg border border-border/20 bg-background/50 p-3 space-y-2">
              {description && (
                <p className="text-sm text-muted-foreground line-clamp-3">{description}</p>
              )}
              {highlights.filter((h) => h.text.trim()).length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {highlights
                    .filter((h) => h.text.trim())
                    .map((h, i) => {
                      const Ico = getIconComponent(h.icon);
                      return (
                        <div
                          key={i}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-xs font-medium text-primary"
                        >
                          <Ico className="h-3 w-3" />
                          {h.text}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
