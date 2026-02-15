/**
 * ParticipantPicker
 *
 * Searchable multi-select for adding system users (from profiles) or external
 * guests to a meeting, each with a role assignment.
 *
 * Based on the PersonCell pattern — queries profiles with .or(full_name.ilike, email.ilike).
 */

import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, X, Search, Plus, UserPlus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/use-debounce';

export const PARTICIPANT_ROLES = [
  { value: 'host', label: 'Host' },
  { value: 'interviewer', label: 'Interviewer' },
  { value: 'hiring_manager', label: 'Hiring Manager' },
  { value: 'observer', label: 'Observer' },
  { value: 'candidate', label: 'Candidate' },
  { value: 'panelist', label: 'Panelist' },
] as const;

export interface Participant {
  id: string; // unique key for the list (crypto.randomUUID for guests)
  userId?: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  role: string;
  isGuest?: boolean;
}

interface ParticipantPickerProps {
  participants: Participant[];
  onChange: (participants: Participant[]) => void;
}

export function ParticipantPicker({ participants, onChange }: ParticipantPickerProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [guestMode, setGuestMode] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');

  const debouncedSearch = useDebounce(search, 300);

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-participant-picker', debouncedSearch],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .limit(20);

      if (debouncedSearch) {
        query = query.or(`full_name.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: searchOpen && !guestMode,
  });

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const handleSelectProfile = (profile: { id: string; full_name: string | null; avatar_url: string | null; email: string | null }) => {
    if (participants.some(p => p.userId === profile.id)) return; // already added
    onChange([
      ...participants,
      {
        id: crypto.randomUUID(),
        userId: profile.id,
        name: profile.full_name || profile.email || 'Unknown',
        email: profile.email || undefined,
        avatarUrl: profile.avatar_url || undefined,
        role: 'interviewer',
      },
    ]);
    setSearch('');
  };

  const handleAddGuest = () => {
    if (!guestName.trim()) return;
    onChange([
      ...participants,
      {
        id: crypto.randomUUID(),
        name: guestName.trim(),
        email: guestEmail.trim() || undefined,
        role: 'interviewer',
        isGuest: true,
      },
    ]);
    setGuestName('');
    setGuestEmail('');
    setGuestMode(false);
  };

  const handleRemove = (id: string) => {
    onChange(participants.filter(p => p.id !== id));
  };

  const handleRoleChange = (id: string, role: string) => {
    onChange(participants.map(p => (p.id === id ? { ...p, role } : p)));
  };

  return (
    <div className="space-y-3">
      {/* Selected participants */}
      {participants.length > 0 && (
        <div className="space-y-2">
          {participants.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-2 p-2 rounded-lg border bg-muted/30"
            >
              <Avatar className="h-7 w-7">
                <AvatarImage src={p.avatarUrl} />
                <AvatarFallback className="text-[10px]">
                  {getInitials(p.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.name}</p>
                {p.email && (
                  <p className="text-[11px] text-muted-foreground truncate">{p.email}</p>
                )}
              </div>
              {p.isGuest && (
                <Badge variant="outline" className="text-[10px] shrink-0">Guest</Badge>
              )}
              <Select value={p.role} onValueChange={(v) => handleRoleChange(p.id, v)}>
                <SelectTrigger className="w-[130px] h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PARTICIPANT_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value} className="text-xs">
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => handleRemove(p.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add participant */}
      <Popover open={searchOpen} onOpenChange={setSearchOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add participant
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-2" align="start">
          {guestMode ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium">Add external guest</span>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setGuestMode(false)}>
                  Search users
                </Button>
              </div>
              <Input
                placeholder="Name *"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="h-8 text-sm"
                autoFocus
              />
              <Input
                placeholder="Email (optional)"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                className="h-8 text-sm"
              />
              <Button size="sm" className="w-full h-7 text-xs" onClick={handleAddGuest} disabled={!guestName.trim()}>
                Add Guest
              </Button>
            </div>
          ) : (
            <>
              <div className="relative mb-2">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-7 h-8 text-sm"
                  autoFocus
                />
              </div>
              <ScrollArea className="h-48">
                <div className="space-y-0.5">
                  {profiles.map((profile) => {
                    const alreadyAdded = participants.some(p => p.userId === profile.id);
                    return (
                      <button
                        key={profile.id}
                        onClick={() => handleSelectProfile(profile)}
                        disabled={alreadyAdded}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                          alreadyAdded
                            ? 'opacity-40 cursor-not-allowed'
                            : 'hover:bg-accent cursor-pointer'
                        }`}
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={profile.avatar_url || undefined} />
                          <AvatarFallback className="text-[10px]">
                            {getInitials(profile.full_name || profile.email || '?')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 text-left min-w-0">
                          <p className="font-medium truncate">{profile.full_name || 'Unknown'}</p>
                          {profile.email && (
                            <p className="text-[11px] text-muted-foreground truncate">{profile.email}</p>
                          )}
                        </div>
                        {alreadyAdded && (
                          <span className="text-[10px] text-muted-foreground">Added</span>
                        )}
                      </button>
                    );
                  })}
                  {profiles.length === 0 && (
                    <p className="text-center text-xs text-muted-foreground py-4">
                      {debouncedSearch ? 'No users found' : 'Type to search...'}
                    </p>
                  )}
                </div>
              </ScrollArea>
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-1 gap-1 text-xs h-7"
                onClick={() => setGuestMode(true)}
              >
                <UserPlus className="h-3 w-3" /> Add external guest
              </Button>
            </>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
