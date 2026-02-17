import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AttendeeProfile {
  avatar_url: string | null;
  full_name: string | null;
}

export type AttendeeProfileMap = Map<string, AttendeeProfile>;

/** Replace Gravatar `d=mp` with `d=404` so placeholders 404 and trigger initials fallback. */
function sanitizeGravatarUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes('gravatar.com')) {
      u.searchParams.set('d', '404');
      return u.toString();
    }
  } catch {
    // not a valid URL, return as-is
  }
  return url;
}

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

      // Query 1: profiles table (highest priority — direct email match)
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

      // Query 2: calendar_connections → profiles (resolves calendar emails to user avatars)
      const unresolvedAfterProfiles = uniqueEmails.filter((e) => !map.has(e));
      if (unresolvedAfterProfiles.length > 0) {
        const { data: connections } = await supabase
          .from('calendar_connections')
          .select('email, user_id')
          .in('email', unresolvedAfterProfiles);

        if (connections && connections.length > 0) {
          // Get unique user_ids to fetch their profiles
          const userIds = [...new Set(connections.map((c) => c.user_id))];
          const { data: connProfiles } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', userIds);

          if (connProfiles) {
            const profileById = new Map(connProfiles.map((p) => [p.id, p]));
            for (const conn of connections) {
              const key = conn.email.toLowerCase();
              if (!map.has(key)) {
                const prof = profileById.get(conn.user_id);
                if (prof) {
                  map.set(key, {
                    avatar_url: prof.avatar_url ?? null,
                    full_name: prof.full_name ?? null,
                  });
                }
              }
            }
          }
        }
      }

      // Query 3: emails table for still-unresolved addresses (Gmail sync / Gravatar)
      const unresolvedAfterConnections = uniqueEmails.filter((e) => !map.has(e));
      if (unresolvedAfterConnections.length > 0) {
        const { data: emailRecords } = await supabase
          .from('emails')
          .select('from_email, from_name, from_avatar_url')
          .in('from_email', unresolvedAfterConnections);

        if (emailRecords) {
          for (const rec of emailRecords) {
            if (rec.from_email) {
              const key = rec.from_email.toLowerCase();
              if (!map.has(key)) {
                map.set(key, {
                  avatar_url: sanitizeGravatarUrl(rec.from_avatar_url),
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
