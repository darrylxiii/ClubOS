import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User, X, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PersonValue {
  id: string;
  name: string;
  avatar_url?: string;
  email?: string;
}

interface PersonCellProps {
  value: PersonValue | PersonValue[] | null;
  onChange: (value: PersonValue | PersonValue[] | null) => void;
  multiple?: boolean;
}

export function PersonCell({ value, onChange, multiple = false }: PersonCellProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-for-person-cell', search],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .limit(20);
      
      if (search) {
        query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data?.map(p => ({
        id: p.id,
        name: p.full_name || p.email || 'Unknown',
        avatar_url: p.avatar_url ?? undefined,
        email: p.email ?? undefined
      })) || [];
    },
  });

  const selectedPeople: PersonValue[] = Array.isArray(value) 
    ? value 
    : value ? [value] : [];

  const handleSelect = (person: PersonValue) => {
    if (multiple) {
      const isSelected = selectedPeople.some(p => p.id === person.id);
      if (isSelected) {
        onChange(selectedPeople.filter(p => p.id !== person.id));
      } else {
        onChange([...selectedPeople, person]);
      }
    } else {
      onChange(person);
      setOpen(false);
    }
  };

  const handleRemove = (personId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (multiple) {
      onChange(selectedPeople.filter(p => p.id !== personId));
    } else {
      onChange(null);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="w-full h-auto min-h-[32px] justify-start px-2 py-1 font-normal"
        >
          {selectedPeople.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {selectedPeople.map((person) => (
                <Badge
                  key={person.id}
                  variant="secondary"
                  className="flex items-center gap-1 pr-1"
                >
                  <Avatar className="h-4 w-4">
                    <AvatarImage src={person.avatar_url} />
                    <AvatarFallback className="text-[8px]">
                      {getInitials(person.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs">{person.name}</span>
                  <button
                    onClick={(e) => handleRemove(person.id, e)}
                    className="ml-0.5 hover:bg-muted rounded"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground flex items-center gap-1">
              <User className="h-3 w-3" />
              <span className="text-xs">Add person...</span>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            placeholder="Search people..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-7 h-8 text-sm"
          />
        </div>
        <ScrollArea className="h-48">
          <div className="space-y-1">
            {profiles.map((person) => {
              const isSelected = selectedPeople.some(p => p.id === person.id);
              return (
                <button
                  key={person.id}
                  onClick={() => handleSelect(person)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-accent transition-colors ${
                    isSelected ? 'bg-accent' : ''
                  }`}
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={person.avatar_url} />
                    <AvatarFallback className="text-[10px]">
                      {getInitials(person.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <div className="font-medium">{person.name}</div>
                    {person.email && (
                      <div className="text-xs text-muted-foreground">{person.email}</div>
                    )}
                  </div>
                  {isSelected && (
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
            {profiles.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-4">
                No people found
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
