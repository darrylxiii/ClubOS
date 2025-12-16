import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Link2, X, Search, ExternalLink } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';

interface RelationValue {
  id: string;
  title: string;
  database_id: string;
  database_name?: string;
}

interface RelationCellProps {
  value: RelationValue | RelationValue[] | null;
  onChange: (value: RelationValue | RelationValue[] | null) => void;
  relationDatabaseId?: string;
  multiple?: boolean;
}

export function RelationCell({ 
  value, 
  onChange, 
  relationDatabaseId,
  multiple = true 
}: RelationCellProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Fetch available databases for relation
  const { data: databases = [] } = useQuery({
    queryKey: ['workspace-databases-for-relation'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspace_databases')
        .select('id, name')
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch rows from target database
  const { data: rows = [] } = useQuery({
    queryKey: ['database-rows-for-relation', relationDatabaseId, search],
    queryFn: async () => {
      if (!relationDatabaseId) return [];
      
      const { data, error } = await supabase
        .from('workspace_database_rows')
        .select('id, data')
        .eq('database_id', relationDatabaseId)
        .limit(50);
      
      if (error) throw error;
      
      // Extract title from row data
      return (data || []).map(row => {
        const rowData = row.data as Record<string, unknown>;
        // Try to find a title-like field
        const title = rowData?.title || rowData?.name || rowData?.Name || rowData?.Title || 
          Object.values(rowData || {})[0] || 'Untitled';
        return {
          id: row.id,
          title: String(title),
          database_id: relationDatabaseId,
        };
      }).filter(row => 
        !search || row.title.toLowerCase().includes(search.toLowerCase())
      );
    },
    enabled: !!relationDatabaseId,
  });

  const selectedRelations: RelationValue[] = Array.isArray(value) 
    ? value 
    : value ? [value] : [];

  const handleSelect = (relation: RelationValue) => {
    if (multiple) {
      const isSelected = selectedRelations.some(r => r.id === relation.id);
      if (isSelected) {
        onChange(selectedRelations.filter(r => r.id !== relation.id));
      } else {
        onChange([...selectedRelations, relation]);
      }
    } else {
      onChange(relation);
      setOpen(false);
    }
  };

  const handleRemove = (relationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (multiple) {
      onChange(selectedRelations.filter(r => r.id !== relationId));
    } else {
      onChange(null);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="w-full h-auto min-h-[32px] justify-start px-2 py-1 font-normal"
        >
          {selectedRelations.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {selectedRelations.map((relation) => (
                <HoverCard key={relation.id}>
                  <HoverCardTrigger asChild>
                    <Badge
                      variant="outline"
                      className="flex items-center gap-1 pr-1 cursor-pointer hover:bg-accent"
                    >
                      <Link2 className="h-3 w-3" />
                      <span className="text-xs max-w-[100px] truncate">{relation.title}</span>
                      <button
                        onClick={(e) => handleRemove(relation.id, e)}
                        className="ml-0.5 hover:bg-muted rounded"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-64 p-3" align="start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Link2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{relation.title}</span>
                      </div>
                      {relation.database_name && (
                        <div className="text-xs text-muted-foreground">
                          From: {relation.database_name}
                        </div>
                      )}
                      <Button size="sm" variant="outline" className="w-full">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Open
                      </Button>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground flex items-center gap-1">
              <Link2 className="h-3 w-3" />
              <span className="text-xs">Add relation...</span>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        {!relationDatabaseId ? (
          <div className="space-y-2">
            <div className="text-sm font-medium">Select database to link</div>
            <ScrollArea className="h-48">
              {databases.map((db) => (
                <button
                  key={db.id}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-accent transition-colors text-left"
                >
                  <Link2 className="h-4 w-4 text-muted-foreground" />
                  {db.name}
                </button>
              ))}
              {databases.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-4">
                  No databases available
                </div>
              )}
            </ScrollArea>
          </div>
        ) : (
          <>
            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Search rows..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-7 h-8 text-sm"
              />
            </div>
            <ScrollArea className="h-48">
              <div className="space-y-1">
                {rows.map((row) => {
                  const isSelected = selectedRelations.some(r => r.id === row.id);
                  return (
                    <button
                      key={row.id}
                      onClick={() => handleSelect(row)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-accent transition-colors ${
                        isSelected ? 'bg-accent' : ''
                      }`}
                    >
                      <Link2 className="h-3 w-3 text-muted-foreground" />
                      <span className="flex-1 text-left truncate">{row.title}</span>
                      {isSelected && (
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      )}
                    </button>
                  );
                })}
                {rows.length === 0 && (
                  <div className="text-center text-sm text-muted-foreground py-4">
                    No rows found
                  </div>
                )}
              </div>
            </ScrollArea>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
