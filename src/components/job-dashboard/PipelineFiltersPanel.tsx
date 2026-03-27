import { memo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Filter, X, ArrowUpDown, Save, Trash2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { PipelineFilterState, SortField, SortDir, DaysRange, RiskLevel } from "@/hooks/usePipelineFilters";
import type { PipelineFilterPreset } from "@/hooks/usePipelineFilterPresets";

interface PipelineFiltersPanelProps {
  filters: PipelineFilterState;
  setFilter: <K extends keyof PipelineFilterState>(key: K, value: PipelineFilterState[K]) => void;
  resetFilters: () => void;
  activeFilterCount: number;
  isDefault: boolean;
  // Presets
  presets: PipelineFilterPreset[];
  canAddMore: boolean;
  onSavePreset: (name: string, filters: PipelineFilterState) => boolean;
  onDeletePreset: (id: string) => void;
  onApplyPreset: (filters: PipelineFilterState) => void;
}

const MATCH_SCORE_OPTIONS = [
  { value: 0, label: 'All' },
  { value: 60, label: '60%+' },
  { value: 80, label: '80%+' },
];

const SOURCE_OPTIONS = [
  { value: 'direct', label: 'Direct' },
  { value: 'club_sync', label: 'Club Sync' },
  { value: 'referral', label: 'Referral' },
  { value: 'other', label: 'Other' },
];

const DAYS_OPTIONS: { value: DaysRange; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'lt7', label: '< 7d' },
  { value: '7to14', label: '7-14d' },
  { value: 'gt14', label: '> 14d' },
];

const RISK_OPTIONS: { value: RiskLevel; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'none', label: 'None' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const SORT_OPTIONS: { value: SortField; label: string; defaultDir: SortDir }[] = [
  { value: 'applied_date', label: 'Applied Date', defaultDir: 'desc' },
  { value: 'match_score', label: 'Match Score', defaultDir: 'desc' },
  { value: 'days_in_stage', label: 'Days in Stage', defaultDir: 'desc' },
  { value: 'name', label: 'Name', defaultDir: 'asc' },
];

export const PipelineFiltersPanel = memo(({
  filters,
  setFilter,
  resetFilters,
  activeFilterCount,
  isDefault,
  presets,
  canAddMore,
  onSavePreset,
  onDeletePreset,
  onApplyPreset,
}: PipelineFiltersPanelProps) => {
  const { t } = useTranslation('jobDashboard');
  const [expanded, setExpanded] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [presetName, setPresetName] = useState('');

  const toggleSource = (source: string) => {
    const next = filters.sources.includes(source)
      ? filters.sources.filter((s) => s !== source)
      : [...filters.sources, source];
    setFilter('sources', next);
  };

  const handleSavePreset = () => {
    if (!presetName.trim()) return;
    const success = onSavePreset(presetName.trim(), filters);
    if (success) {
      toast.success(t('filters.presetSaved', 'View saved'));
      setPresetName('');
      setShowSaveDialog(false);
    } else {
      toast.error(t('filters.maxPresets', 'Maximum 10 saved views'));
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        {/* Toggle button */}
        <Button
          variant={expanded ? "secondary" : "outline"}
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="h-8 gap-1.5 text-xs border-border/20"
        >
          <Filter className="w-3.5 h-3.5" />
          {t('filters.title', 'Filters')}
          {activeFilterCount > 0 && (
            <Badge variant="default" className="h-4 px-1 text-[10px] ml-0.5">
              {activeFilterCount}
            </Badge>
          )}
        </Button>

        {/* Sort dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs border-border/20">
              <ArrowUpDown className="w-3.5 h-3.5" />
              {SORT_OPTIONS.find((o) => o.value === filters.sortBy)?.label}
              {filters.sortDir === 'asc' ? ' ↑' : ' ↓'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {SORT_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => {
                  if (filters.sortBy === option.value) {
                    setFilter('sortDir', filters.sortDir === 'asc' ? 'desc' : 'asc');
                  } else {
                    setFilter('sortBy', option.value);
                    setFilter('sortDir', option.defaultDir);
                  }
                }}
              >
                {option.label}
                {filters.sortBy === option.value && (
                  <span className="ml-auto text-muted-foreground">
                    {filters.sortDir === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Saved views dropdown */}
        {(presets.length > 0 || canAddMore) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs border-border/20">
                <Save className="w-3.5 h-3.5" />
                {t('filters.views', 'Views')}
                {presets.length > 0 && (
                  <span className="text-muted-foreground">({presets.length})</span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {presets.map((preset) => (
                <DropdownMenuItem
                  key={preset.id}
                  className="justify-between"
                  onClick={() => onApplyPreset(preset.filters)}
                >
                  <span className="truncate">{preset.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeletePreset(preset.id);
                      toast.success(t('filters.presetDeleted', 'View deleted'));
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </DropdownMenuItem>
              ))}
              {canAddMore && activeFilterCount > 0 && (
                <DropdownMenuItem onClick={() => setShowSaveDialog(true)}>
                  <Save className="w-3.5 h-3.5 mr-2" />
                  {t('filters.saveView', 'Save current view...')}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Clear all */}
        {!isDefault && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="h-8 text-xs text-muted-foreground"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            {t('filters.clear', 'Clear')}
          </Button>
        )}
      </div>

      {/* Expanded filter panel */}
      {expanded && (
        <div className="flex flex-wrap gap-x-6 gap-y-3 p-3 rounded-lg bg-card/30 backdrop-blur-[var(--blur-glass-subtle)] border border-border/20">
          {/* Match Score */}
          <div className="space-y-1">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              {t('filters.matchScore', 'Match Score')}
            </span>
            <div className="flex gap-1">
              {MATCH_SCORE_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  variant={filters.matchScoreMin === opt.value ? "default" : "outline"}
                  size="sm"
                  className="h-6 px-2 text-[10px]"
                  onClick={() => setFilter('matchScoreMin', opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Source */}
          <div className="space-y-1">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              {t('filters.source', 'Source')}
            </span>
            <div className="flex gap-1 flex-wrap">
              {SOURCE_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  variant={filters.sources.includes(opt.value) ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-6 px-2 text-[10px]",
                    filters.sources.includes(opt.value) && "gap-1",
                  )}
                  onClick={() => toggleSource(opt.value)}
                >
                  {filters.sources.includes(opt.value) && <Check className="w-2.5 h-2.5" />}
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Days in Stage */}
          <div className="space-y-1">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              {t('filters.daysInStage', 'Days in Stage')}
            </span>
            <div className="flex gap-1">
              {DAYS_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  variant={filters.daysRange === opt.value ? "default" : "outline"}
                  size="sm"
                  className="h-6 px-2 text-[10px]"
                  onClick={() => setFilter('daysRange', opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Risk Level */}
          <div className="space-y-1">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              {t('filters.riskLevel', 'Risk Level')}
            </span>
            <div className="flex gap-1">
              {RISK_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  variant={filters.riskLevel === opt.value ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-6 px-2 text-[10px]",
                    opt.value === 'high' && filters.riskLevel === opt.value && "bg-destructive text-destructive-foreground",
                    opt.value === 'medium' && filters.riskLevel === opt.value && "bg-warning text-warning-foreground",
                  )}
                  onClick={() => setFilter('riskLevel', opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Save preset dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-[340px]">
          <DialogHeader>
            <DialogTitle>{t('filters.saveViewTitle', 'Save View')}</DialogTitle>
          </DialogHeader>
          <Input
            value={presetName}
            onChange={(e) => setPresetName(e.target.value.slice(0, 50))}
            placeholder={t('filters.viewName', 'View name...')}
            onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              {t('actions.cancel', 'Cancel')}
            </Button>
            <Button onClick={handleSavePreset} disabled={!presetName.trim()}>
              {t('actions.save', 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});

PipelineFiltersPanel.displayName = 'PipelineFiltersPanel';
