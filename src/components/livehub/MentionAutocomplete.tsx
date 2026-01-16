import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Member {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface MentionAutocompleteProps {
  query: string;
  onSelect: (member: Member) => void;
  position: { top: number; left: number };
}

export function MentionAutocomplete({ query, onSelect, position }: MentionAutocompleteProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const searchMembers = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .ilike('full_name', `%${query}%`)
        .limit(5);

      setMembers(data || []);
      setSelectedIndex(0);
    };

    if (query) {
      searchMembers();
    }
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % members.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + members.length) % members.length);
      } else if (e.key === 'Enter' && members[selectedIndex]) {
        e.preventDefault();
        onSelect(members[selectedIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [members, selectedIndex, onSelect]);

  if (!members.length) return null;

  return (
    <div
      className="absolute z-50 w-64 bg-popover border border-border rounded-lg shadow-lg overflow-hidden"
      style={{ top: position.top, left: position.left }}
    >
      {members.map((member, index) => (
        <button
          key={member.id}
          className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-accent text-left ${
            index === selectedIndex ? 'bg-accent' : ''
          }`}
          onClick={() => onSelect(member)}
        >
          <Avatar className="h-6 w-6">
            <AvatarImage src={member.avatar_url || undefined} />
            <AvatarFallback className="text-xs">
              {(member.full_name || 'U').substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm">{member.full_name || 'Unknown'}</span>
        </button>
      ))}
    </div>
  );
}
