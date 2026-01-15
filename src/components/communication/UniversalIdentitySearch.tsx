
import { useState, useEffect } from 'react';
import { Search, User, Briefcase, Target, Plus, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';

export interface IdentityResult {
    id: string;
    name: string;
    email?: string;
    type: 'user' | 'candidate' | 'prospect';
}

interface UniversalIdentitySearchProps {
    onSelect: (identity: IdentityResult | null) => void;
    defaultValue?: string;
    defaultEntityType?: string;
}

export function UniversalIdentitySearch({ onSelect, defaultValue, defaultEntityType }: UniversalIdentitySearchProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<IdentityResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selected, setSelected] = useState<IdentityResult | null>(null);

    useEffect(() => {
        if (query.length < 3) {
            setResults([]);
            return;
        }

        const timer = setTimeout(() => {
            searchIdentities();
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    const searchIdentities = async () => {
        setIsLoading(true);
        try {
            const [usersRes, candidatesRes, prospectsRes] = await Promise.all([
                supabase.from('profiles').select('id, full_name, email').ilike('full_name', `%${query}%`).limit(3),
                supabase.from('candidate_profiles').select('id, full_name, email').ilike('full_name', `%${query}%`).limit(3),
                supabase.from('crm_prospects').select('id, full_name, email').ilike('full_name', `%${query}%`).limit(3)
            ]);

            const allResults: IdentityResult[] = [
                ...(usersRes.data || []).map(u => ({ id: u.id, name: u.full_name || 'Unnamed', email: u.email, type: 'user' as const })),
                ...(candidatesRes.data || []).map(c => ({ id: c.id, name: c.full_name, email: c.email, type: 'candidate' as const })),
                ...(prospectsRes.data || []).map(p => ({ id: p.id, name: p.full_name, email: p.email, type: 'prospect' as const }))
            ];

            setResults(allResults);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelect = (identity: IdentityResult) => {
        setSelected(identity);
        setQuery(identity.name);
        setResults([]);
        onSelect(identity);
    };

    const clearSelection = () => {
        setSelected(null);
        setQuery('');
        onSelect(null);
    };

    return (
        <div className="relative w-full space-y-2">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search by name or email..."
                    className="pl-10"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                {isLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                )}
            </div>

            {selected && (
                <div className="flex items-center justify-between p-2 bg-primary/5 border border-primary/20 rounded-md text-sm">
                    <div className="flex items-center gap-2">
                        <IdentityIcon type={selected.type} />
                        <div>
                            <p className="font-medium">{selected.name}</p>
                            <p className="text-xs text-muted-foreground">{selected.email} ({selected.type})</p>
                        </div>
                    </div>
                    <button onClick={clearSelection} className="text-xs hover:underline text-muted-foreground">Clear</button>
                </div>
            )}

            {results.length > 0 && !selected && (
                <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg overflow-hidden max-h-[300px] overflow-y-auto">
                    {results.map((res) => (
                        <div
                            key={`${res.type}-${res.id}`}
                            className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer transition-colors border-b last:border-0"
                            onClick={() => handleSelect(res)}
                        >
                            <IdentityIcon type={res.type} />
                            <div className="flex-1">
                                <p className="text-sm font-medium">{res.name}</p>
                                <p className="text-xs text-muted-foreground">{res.email}</p>
                            </div>
                            <span className="text-[10px] bg-muted px-2 py-0.5 rounded uppercase font-bold tracking-tighter">
                                {res.type}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {query.length >= 3 && results.length === 0 && !isLoading && !selected && (
                <div className="p-4 text-center border rounded-md border-dashed">
                    <p className="text-sm text-muted-foreground mb-2">No identity found for "{query}"</p>
                    <button
                        className="text-xs flex items-center gap-1 mx-auto text-primary hover:underline"
                        onClick={() => onSelect({ id: 'NEW', name: query, type: 'prospect' })}
                    >
                        <Plus className="h-3 w-3" /> Create Ghost Prospect Profile
                    </button>
                </div>
            )}
        </div>
    );
}

function IdentityIcon({ type }: { type: string }) {
    switch (type) {
        case 'user': return <User className="h-4 w-4 text-blue-500" />;
        case 'candidate': return <Briefcase className="h-4 w-4 text-emerald-500" />;
        case 'prospect': return <Target className="h-4 w-4 text-orange-500" />;
        default: return <User className="h-4 w-4" />;
    }
}
