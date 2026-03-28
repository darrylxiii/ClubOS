import { useTranslation } from 'react-i18next';
import { motion } from '@/lib/motion';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  Clock,
  Activity,
  Target,
  TrendingUp,
  Briefcase,
  type LucideIcon,
} from 'lucide-react';

// ── Section IDs ────────────────────────────────────────────────────
export type BriefingSectionId =
  | 'hiring-progress'
  | 'time-cost'
  | 'pipeline-health'
  | 'benchmarks'
  | 'quarterly-trends'
  | 'open-roles';

export const ALL_SECTIONS: BriefingSectionId[] = [
  'hiring-progress',
  'time-cost',
  'pipeline-health',
  'benchmarks',
  'quarterly-trends',
  'open-roles',
];

interface SectionMeta {
  id: BriefingSectionId;
  icon: LucideIcon;
  labelKey: string;
  labelFallback: string;
  descKey: string;
  descFallback: string;
}

const SECTIONS: SectionMeta[] = [
  {
    id: 'hiring-progress',
    icon: BarChart3,
    labelKey: 'briefing.sections.hiringProgress',
    labelFallback: 'Hiring Progress',
    descKey: 'briefing.sections.hiringProgressDesc',
    descFallback: 'Pipeline overview with total applications, hires, and active jobs.',
  },
  {
    id: 'time-cost',
    icon: Clock,
    labelKey: 'briefing.sections.timeCost',
    labelFallback: 'Time & Cost Metrics',
    descKey: 'briefing.sections.timeCostDesc',
    descFallback: 'Average time-to-fill and cost-per-hire analysis.',
  },
  {
    id: 'pipeline-health',
    icon: Activity,
    labelKey: 'briefing.sections.pipelineHealth',
    labelFallback: 'Pipeline Health',
    descKey: 'briefing.sections.pipelineHealthDesc',
    descFallback: 'Stage distribution and bottleneck identification.',
  },
  {
    id: 'benchmarks',
    icon: Target,
    labelKey: 'briefing.sections.benchmarks',
    labelFallback: 'Benchmarks',
    descKey: 'briefing.sections.benchmarksDesc',
    descFallback: 'Performance vs industry and network averages.',
  },
  {
    id: 'quarterly-trends',
    icon: TrendingUp,
    labelKey: 'briefing.sections.quarterlyTrends',
    labelFallback: 'Quarterly Trends',
    descKey: 'briefing.sections.quarterlyTrendsDesc',
    descFallback: 'Key metrics tracked across the last four quarters.',
  },
  {
    id: 'open-roles',
    icon: Briefcase,
    labelKey: 'briefing.sections.openRoles',
    labelFallback: 'Open Roles Summary',
    descKey: 'briefing.sections.openRolesDesc',
    descFallback: 'Active roles with application counts and days open.',
  },
];

// ── Component ──────────────────────────────────────────────────────
interface BriefingSectionSelectorProps {
  selected: Set<BriefingSectionId>;
  onChange: (next: Set<BriefingSectionId>) => void;
  className?: string;
}

export function BriefingSectionSelector({
  selected,
  onChange,
  className,
}: BriefingSectionSelectorProps) {
  const { t } = useTranslation('partner');

  const allSelected = selected.size === ALL_SECTIONS.length;
  const noneSelected = selected.size === 0;

  const toggleSection = (id: BriefingSectionId) => {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onChange(next);
  };

  const selectAll = () => onChange(new Set(ALL_SECTIONS));
  const deselectAll = () => onChange(new Set());

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={selectAll}
          disabled={allSelected}
        >
          {t('briefing.selectAll', 'Select All')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={deselectAll}
          disabled={noneSelected}
        >
          {t('briefing.deselectAll', 'Deselect All')}
        </Button>
      </div>

      {/* Sections list */}
      <div className="space-y-2">
        {SECTIONS.map((section, idx) => {
          const Icon = section.icon;
          const checked = selected.has(section.id);

          return (
            <motion.label
              key={section.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.04, duration: 0.25 }}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors duration-150',
                'border border-border/20 hover:border-primary/30',
                checked
                  ? 'bg-primary/5 border-primary/20'
                  : 'bg-card/20'
              )}
            >
              <Checkbox
                checked={checked}
                onCheckedChange={() => toggleSection(section.id)}
                className="mt-0.5"
              />
              <div className="flex items-start gap-2.5 flex-1 min-w-0">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight">
                    {t(section.labelKey, section.labelFallback)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {t(section.descKey, section.descFallback)}
                  </p>
                </div>
              </div>
            </motion.label>
          );
        })}
      </div>
    </div>
  );
}
