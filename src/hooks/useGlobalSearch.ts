import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { FileText, Briefcase, User, Building } from 'lucide-react';
import { CommandItem } from '@/contexts/CommandContext';

interface SearchResult {
    id: string;
    type: 'page' | 'job' | 'contact' | 'company' | 'email';
    title: string;
    subtitle?: string;
    url: string;
    metadata?: any;
}

export function useGlobalSearch() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<CommandItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const search = useDebouncedCallback(async (term: string) => {
        if (!term || term.length < 2) {
            setResults([]);
            return;
        }

        setIsLoading(true);

        try {
        const [pages, jobs, contacts, companies] = await Promise.all([
            // Search Pages
            (supabase as any)
                .from('pages')
                .select('id, title, icon')
                .ilike('title', `%${term}%`)
                .limit(5),

                // Search Jobs
                (supabase as any)
                    .from('jobs')
                    .select('id, title')
                    .ilike('title', `%${term}%`)
                    .limit(5),

                // Search Contacts (Prospects)
                (supabase as any)
                    .from('crm_prospects')
                    .select('id, first_name, last_name')
                    .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%`)
                    .limit(5),

                // Search Companies
                (supabase as any)
                    .from('companies')
                    .select('id, name, industry')
                    .ilike('name', `%${term}%`)
                    .limit(5),
            ]);

            const newResults: CommandItem[] = [];

            // Process Pages
            pages.data?.forEach((p: any) => {
                newResults.push({
                    id: `page-${p.id}`,
                    label: p.title || 'Untitled Page',
                    icon: FileText,
                    category: 'Pages',
                    path: `/pages/${p.id}`,
                    type: 'search-result'
                } as any);
            });

            // Process Jobs
            jobs.data?.forEach((j: any) => {
                newResults.push({
                    id: `job-${j.id}`,
                    label: j.title,
                    icon: Briefcase,
                    category: 'Jobs',
                    path: `/jobs/${j.id}`,
                    type: 'search-result'
                } as any);
            });

            // Process Contacts
            contacts.data?.forEach((c: any) => {
                newResults.push({
                    id: `contact-${c.id}`,
                    label: `${c.first_name} ${c.last_name}`,
                    icon: User,
                    category: 'Contacts',
                    path: `/contacts/${c.id}`,
                    type: 'search-result'
                } as any);
            });

            // Process Companies
            companies.data?.forEach((c: any) => {
                newResults.push({
                    id: `company-${c.id}`,
                    label: c.name,
                    icon: Building,
                    category: 'Companies',
                    path: `/companies/${c.id}`,
                    type: 'search-result'
                } as any);
            });

            setResults(newResults);
        } catch (error) {
            console.error('Global search failed:', error);
        } finally {
            setIsLoading(false);
        }
    }, 300);

    useEffect(() => {
        search(query);
    }, [query, search]);

    return { query, setQuery, results, isLoading };
}
