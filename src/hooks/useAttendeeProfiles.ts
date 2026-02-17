import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AttendeeProfile {
  avatar_url: string | null;
  full_name: string | null;
}

export type AttendeeProfileMap = Map<string, AttendeeProfile>;

export function useAttendeeProfiles(emails: string[]) {
  const uniqueEmails = useMemo(() => {
    const set = new Set(emails.map((e) => e.toLowerCase().trim()).filter(Boolean));
    return Array.from(set).sort();
  }, [emails]);

  const cacheKey = useMemo(() => uniqueEmails.join(','), [uniqueEmails]);

  const { data: profileMap = new Map() as AttendeeProfileMap, isLoading } = useQuery({
    queryKey: ['attendee-profiles', cacheKey],
    queryFn: async (): Promise<AttendeeProfileMap> => {
      if (uniqueEmails.length === 0) return new Map();

      const map: AttendeeProfileMap = new Map();

      // Query 1: profiles table (highest priority)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('email, full_name, avatar_url')
        .in('email', uniqueEmails);

      if (profiles) {
        for (const p of profiles) {
          if (p.email) {
            map.set(p.email.toLowerCase(), {
              avatar_url: p.avatar_url ?? null,
              full_name: p.full_name ?? null,
            });
          }
        }
      }

      // Query 2: emails table for unresolved addresses
      const unresolvedEmails = uniqueEmails.filter((e) => !map.has(e));
      if (unresolvedEmails.length > 0) {
        const { data: emailRecords } = await supabase
          .from('emails')
          .select('from_email, from_name, from_avatar_url')
          .in('from_email', unresolvedEmails);

        if (emailRecords) {
          // Deduplicate: first record per from_email wins
          for (const rec of emailRecords) {
            if (rec.from_email) {
              const key = rec.from_email.toLowerCase();
              if (!map.has(key)) {
                map.set(key, {
                  avatar_url: rec.from_avatar_url ?? null,
                  full_name: rec.from_name ?? null,
                });
              }
            }
          }
        }
      }

      return map;
    },
    enabled: uniqueEmails.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  return { profileMap, isLoading };
}
