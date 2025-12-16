import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatabaseView, ViewType } from '@/hooks/useWorkspaceDatabase';
import { Table2, LayoutGrid, GalleryHorizontal, List, Calendar, Plus, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DatabaseViewSwitcherProps {
  views: DatabaseView[];
  activeViewId: string | null;
  onViewChange: (viewId: string) => void;
  onAddView: (name: string, viewType: ViewType) => Promise<unknown>;
}

const viewIcons: Record<ViewType, React.ReactNode> = {
  table: <Table2 className="h-4 w-4" />,
  board: <LayoutGrid className="h-4 w-4" />,
  gallery: <GalleryHorizontal className="h-4 w-4" />,
  list: <List className="h-4 w-4" />,
  calendar: <Calendar className="h-4 w-4" />,
};

const viewLabels: Record<ViewType, string> = {
  table: 'Table',
  board: 'Board',
  gallery: 'Gallery',
  list: 'List',
  calendar: 'Calendar',
};

export function DatabaseViewSwitcher({
  views,
  activeViewId,
  onViewChange,
  onAddView,
}: DatabaseViewSwitcherProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const [newViewType, setNewViewType] = useState<ViewType>('table');

  const activeView = views.find(v => v.id === activeViewId);

  const handleAddView = async () => {
    if (!newViewName.trim()) return;
    await onAddView(newViewName, newViewType);
    setNewViewName('');
    setNewViewType('table');
    setIsAddDialogOpen(false);
  };

  return (
    <>
      <div className="flex items-center gap-1">
        {/* View tabs */}
        <div className="flex items-center gap-1 bg-muted/50 rounded-md p-0.5">
          {views.slice(0, 3).map((view) => (
            <Button
              key={view.id}
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 px-2 gap-1.5 text-xs",
                activeViewId === view.id && "bg-background shadow-sm"
              )}
              onClick={() => onViewChange(view.id)}
            >
              {viewIcons[view.view_type]}
              <span>{view.name}</span>
            </Button>
          ))}
        </div>

        {/* More views dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2">
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {views.length > 3 && (
              <>
                {views.slice(3).map((view) => (
                  <DropdownMenuItem key={view.id} onClick={() => onViewChange(view.id)}>
                    {viewIcons[view.view_type]}
                    <span className="ml-2">{view.name}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add view
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Add View Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add new view</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>View name</Label>
              <Input
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                placeholder="View name..."
              />
            </div>
            <div className="space-y-2">
              <Label>View type</Label>
              <div className="grid grid-cols-3 gap-2">
                {(['table', 'board', 'gallery'] as ViewType[]).map((type) => (
                  <Button
                    key={type}
                    variant={newViewType === type ? 'secondary' : 'outline'}
                    className="flex flex-col h-auto py-3 gap-1"
                    onClick={() => setNewViewType(type)}
                  >
                    {viewIcons[type]}
                    <span className="text-xs">{viewLabels[type]}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddView} disabled={!newViewName.trim()}>
              Add view
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
