import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Bookmark, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

interface SearchFilters {
  status?: string[];
  priority?: string[];
  assignee?: string[];
  dateRange?: { start: Date; end: Date } | null;
  labels?: string[];
}

interface SavedPreset {
  id: string;
  name: string;
  filters: SearchFilters;
  searchQuery: string;
}

const STORAGE_KEY = "task_filter_presets_v1";
const MAX_PRESETS = 10;

function loadPresets(): SavedPreset[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function persistPresets(presets: SavedPreset[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

interface SavedFilterPresetsProps {
  currentFilters: SearchFilters;
  currentSearchQuery: string;
  onApplyPreset: (filters: SearchFilters, searchQuery: string) => void;
}

export function SavedFilterPresets({
  currentFilters,
  currentSearchQuery,
  onApplyPreset,
}: SavedFilterPresetsProps) {
  const { t } = useTranslation('common');
  const [presets, setPresets] = useState<SavedPreset[]>(loadPresets);
  const [newName, setNewName] = useState("");
  const [open, setOpen] = useState(false);

  const hasActiveFilters =
    currentSearchQuery ||
    (currentFilters.status?.length ?? 0) > 0 ||
    (currentFilters.priority?.length ?? 0) > 0;

  const savePreset = () => {
    if (!newName.trim()) return;
    if (presets.length >= MAX_PRESETS) {
      toast.error(t('tasks.maxPresetsReached', 'Maximum {{max}} presets reached', { max: MAX_PRESETS }));
      return;
    }

    const preset: SavedPreset = {
      id: `p_${Date.now()}`,
      name: newName.trim(),
      filters: currentFilters,
      searchQuery: currentSearchQuery,
    };

    const updated = [...presets, preset];
    setPresets(updated);
    persistPresets(updated);
    setNewName("");
    toast.success(t('tasks.filterPresetSaved', 'Filter preset saved'));
  };

  const deletePreset = (id: string) => {
    const updated = presets.filter((p) => p.id !== id);
    setPresets(updated);
    persistPresets(updated);
  };

  const applyPreset = (preset: SavedPreset) => {
    onApplyPreset(preset.filters, preset.searchQuery);
    setOpen(false);
    toast.success(`Applied "${preset.name}"`);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 relative">
                <Bookmark className="h-4 w-4" />
                {presets.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-primary text-[9px] text-primary-foreground flex items-center justify-center">
                    {presets.length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>{t('tasks.savedFilters', 'Saved Filters')}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <PopoverContent className="w-72 p-3" align="end">
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">{t('tasks.savedFilterPresets', 'Saved Filter Presets')}</h4>

          {/* Preset list */}
          {presets.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">{t('tasks.noSavedPresets', 'No saved presets yet. Apply filters and save them here.')}</p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {presets.map((preset) => (
                <div
                  key={preset.id}
                  className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer group transition-colors"
                  onClick={() => applyPreset(preset)}
                >
                  <Bookmark className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm flex-1 truncate">{preset.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePreset(preset.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Save current */}
          {hasActiveFilters && (
            <div className="border-t pt-2 space-y-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('tasks.saveCurrentFilters', 'Save current filters')}</p>
              <div className="flex gap-1.5">
                <Input
                  placeholder={t('tasks.presetName', 'Preset name...')}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="h-8 text-xs"
                  onKeyDown={(e) => e.key === "Enter" && savePreset()}
                />
                <Button size="sm" className="h-8 px-2.5" onClick={savePreset} disabled={!newName.trim()}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
