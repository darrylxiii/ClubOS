import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';
import { AvatarAccount } from '@/hooks/useAvatarAccounts';
import { AvatarSession } from '@/hooks/useAvatarSessions';
import { AvatarAccountCard } from './AvatarAccountCard';

interface AvatarAccountGridProps {
  accounts: AvatarAccount[];
  activeSessions: AvatarSession[];
  onStartSession: (account: AvatarAccount) => void;
}

const FILTER_OPTIONS = ['All', 'Available', 'In Use', 'Paused', 'At Risk'] as const;

export function AvatarAccountGrid({ accounts, activeSessions, onStartSession }: AvatarAccountGridProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<typeof FILTER_OPTIONS[number]>('All');

  const activeByAccount = useMemo(() => {
    const map = new Map<string, AvatarSession>();
    activeSessions.forEach(s => map.set(s.account_id, s));
    return map;
  }, [activeSessions]);

  const filtered = useMemo(() => {
    return accounts.filter(a => {
      if (search && !a.label.toLowerCase().includes(search.toLowerCase()) &&
          !a.owner_team?.toLowerCase().includes(search.toLowerCase())) return false;
      const isInUse = activeByAccount.has(a.id);
      switch (filter) {
        case 'Available': return a.status === 'available' && !isInUse;
        case 'In Use': return isInUse;
        case 'Paused': return a.status === 'paused' || a.status === 'banned';
        case 'At Risk': return a.risk_level === 'high' || a.risk_level === 'medium';
        default: return true;
      }
    });
  }, [accounts, search, filter, activeByAccount]);

  const counts = useMemo(() => ({
    all: accounts.length,
    available: accounts.filter(a => a.status === 'available' && !activeByAccount.has(a.id)).length,
    inUse: activeSessions.length,
    paused: accounts.filter(a => a.status === 'paused' || a.status === 'banned').length,
    atRisk: accounts.filter(a => a.risk_level !== 'low').length,
  }), [accounts, activeSessions, activeByAccount]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search accounts…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {FILTER_OPTIONS.map(f => {
            const count = f === 'All' ? counts.all : f === 'Available' ? counts.available : f === 'In Use' ? counts.inUse : f === 'Paused' ? counts.paused : counts.atRisk;
            return (
              <Badge
                key={f}
                variant={filter === f ? 'default' : 'outline'}
                className="cursor-pointer text-xs"
                onClick={() => setFilter(f)}
              >
                {f} ({count})
              </Badge>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filtered.map(account => (
          <AvatarAccountCard
            key={account.id}
            account={account}
            activeSession={activeByAccount.get(account.id)}
            onStartSession={onStartSession}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No accounts match your filter.
        </div>
      )}
    </div>
  );
}
