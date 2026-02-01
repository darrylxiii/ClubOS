import { memo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Bookmark, 
  ChevronDown, 
  Plus, 
  Trash2, 
  Check,
  BookmarkPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { JobFilterState } from '@/types/jobFilters';
import { useSavedFilterPresets, FilterPreset } from '@/hooks/useSavedFilterPresets';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface SavedFilterPresetsProps {
  currentFilters: JobFilterState;
  onApplyPreset: (filters: JobFilterState) => void;
  hasActiveFilters: boolean;
}

export const SavedFilterPresets = memo(({ 
  currentFilters, 
  onApplyPreset,
  hasActiveFilters,
}: SavedFilterPresetsProps) => {
  const { presets, addPreset, deletePreset, canAddMore } = useSavedFilterPresets();
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  const handleSavePreset = () => {
    if (!presetName.trim()) {
      toast.error('Please enter a name for your preset');
      return;
    }

    const success = addPreset(presetName.trim(), currentFilters);
    if (success) {
      toast.success(`Saved "${presetName}" preset`);
      setPresetName('');
      setSaveDialogOpen(false);
    } else {
      toast.error(`Maximum ${10} presets allowed. Delete one to add more.`);
    }
  };

  const handleApplyPreset = (preset: FilterPreset) => {
    onApplyPreset(preset.filters);
    setActivePresetId(preset.id);
    toast.success(`Applied "${preset.name}" filter`);
  };

  const handleDeletePreset = (e: React.MouseEvent, preset: FilterPreset) => {
    e.stopPropagation();
    deletePreset(preset.id);
    if (activePresetId === preset.id) {
      setActivePresetId(null);
    }
    toast.success(`Deleted "${preset.name}" preset`);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className={cn(
              'gap-1.5 h-8',
              activePresetId && 'border-primary/50 bg-primary/5'
            )}
          >
            <Bookmark className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Presets</span>
            {presets.length > 0 && (
              <span className="ml-1 text-xs text-muted-foreground">
                ({presets.length})
              </span>
            )}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Saved Views</span>
            <span className="text-xs font-normal text-muted-foreground">
              {presets.length}/10
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {presets.length === 0 ? (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              <Bookmark className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>No saved presets</p>
              <p className="text-xs">Save your current filters for quick access</p>
            </div>
          ) : (
            presets.map((preset) => (
              <DropdownMenuItem 
                key={preset.id}
                className="flex items-center justify-between group cursor-pointer"
                onClick={() => handleApplyPreset(preset)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {activePresetId === preset.id && (
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium truncate">{preset.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(preset.createdAt), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                  onClick={(e) => handleDeletePreset(e, preset)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </DropdownMenuItem>
            ))
          )}

          <DropdownMenuSeparator />
          
          <DropdownMenuItem
            disabled={!hasActiveFilters || !canAddMore}
            onClick={() => setSaveDialogOpen(true)}
            className="gap-2"
          >
            <BookmarkPlus className="h-4 w-4" />
            Save Current View
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Save Preset Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Save Filter Preset</DialogTitle>
            <DialogDescription>
              Save your current filters for quick access later.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="e.g., My Active Roles, Engineering Hires"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
              maxLength={50}
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-2">
              {presetName.length}/50 characters
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePreset} disabled={!presetName.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              Save Preset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});

SavedFilterPresets.displayName = 'SavedFilterPresets';
