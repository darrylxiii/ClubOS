import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useWorkspacePages, WorkspacePage } from '@/hooks/useWorkspacePages';
import { Star, Clock, Plus, Search } from 'lucide-react';

interface PageSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PageSearchDialog({ open, onOpenChange }: PageSearchDialogProps) {
  const navigate = useNavigate();
  const { pages, favorites, recent, createPage } = useWorkspacePages();
  const [search, setSearch] = useState('');

  // Filter pages based on search
  const filteredPages = useMemo(() => {
    if (!search.trim()) return [];
    const lowerSearch = search.toLowerCase();
    return pages.filter(page => 
      page.title.toLowerCase().includes(lowerSearch)
    ).slice(0, 10);
  }, [pages, search]);

  const handleSelect = useCallback((pageId: string) => {
    navigate(`/pages/${pageId}`);
    onOpenChange(false);
    setSearch('');
  }, [navigate, onOpenChange]);

  const handleCreateNew = useCallback(async () => {
    const newPage = await createPage.mutateAsync({ 
      title: search.trim() || 'Untitled' 
    });
    navigate(`/pages/${newPage.id}`);
    onOpenChange(false);
    setSearch('');
  }, [createPage, navigate, onOpenChange, search]);

  // Reset search when dialog opens
  useEffect(() => {
    if (open) {
      setSearch('');
    }
  }, [open]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput 
        placeholder="Search pages or create new..." 
        value={search}
        onValueChange={setSearch}
      />
      <CommandList className="max-h-[400px]">
        <CommandEmpty className="py-6 text-center">
          <div className="flex flex-col items-center gap-2">
            <Search className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No pages found</p>
            <button
              onClick={handleCreateNew}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Create "{search.trim() || 'Untitled'}"
            </button>
          </div>
        </CommandEmpty>

        {/* Search Results */}
        {filteredPages.length > 0 && (
          <CommandGroup heading="Search Results">
            {filteredPages.map((page) => (
              <PageSearchItem 
                key={page.id} 
                page={page} 
                onSelect={handleSelect}
              />
            ))}
          </CommandGroup>
        )}

        {/* Recent Pages - Show when no search */}
        {!search.trim() && recent.length > 0 && (
          <>
            <CommandGroup heading="Recent">
              {recent.slice(0, 5).map((page) => (
                <PageSearchItem 
                  key={page.id} 
                  page={page} 
                  onSelect={handleSelect}
                  icon={<Clock className="h-4 w-4 text-muted-foreground" />}
                />
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Favorites - Show when no search */}
        {!search.trim() && favorites.length > 0 && (
          <CommandGroup heading="Favorites">
            {favorites.slice(0, 5).map((page) => (
              <PageSearchItem 
                key={page.id} 
                page={page} 
                onSelect={handleSelect}
                icon={<Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
              />
            ))}
          </CommandGroup>
        )}

        {/* Quick Actions */}
        {!search.trim() && (
          <CommandGroup heading="Quick Actions">
            <CommandItem onSelect={handleCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              <span>Create new page</span>
              <kbd className="ml-auto text-xs text-muted-foreground">⌘N</kbd>
            </CommandItem>
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}

interface PageSearchItemProps {
  page: WorkspacePage;
  onSelect: (pageId: string) => void;
  icon?: React.ReactNode;
}

function PageSearchItem({ page, onSelect, icon }: PageSearchItemProps) {
  return (
    <CommandItem
      value={page.id}
      onSelect={() => onSelect(page.id)}
      className="flex items-center gap-2"
    >
      {icon || (
        <span className="text-base">{page.icon_emoji || '📄'}</span>
      )}
      <span className="truncate">{page.title || 'Untitled'}</span>
      {page.is_favorite && !icon && (
        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 ml-auto" />
      )}
    </CommandItem>
  );
}
