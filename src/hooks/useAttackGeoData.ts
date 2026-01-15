import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AttackGeoPoint {
  id: string;
  ip_address: string;
  country: string | null;
  country_code: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  threat_score: number | null;
  is_vpn: boolean | null;
  is_proxy: boolean | null;
  is_tor: boolean | null;
  attack_count: number;
  last_attack: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface CountryAttackStats {
  country_code: string;
  country: string;
  attack_count: number;
  unique_ips: number;
  avg_threat_score: number;
}

export function useAttackGeoData() {
  return useQuery({
    queryKey: ['attack-geo-data'],
    queryFn: async (): Promise<AttackGeoPoint[]> => {
      const { data: threatEvents, error: threatError } = await supabase
        .from('threat_events')
        .select('ip_address, severity, created_at')
        .order('created_at', { ascending: false })
        .limit(500);

      if (threatError) throw threatError;

      const uniqueIPs = [...new Set(threatEvents?.map(e => e.ip_address).filter(Boolean))] as string[];
      if (uniqueIPs.length === 0) return [];

      const { data: geoData, error: geoError } = await supabase
        .from('ip_geo_cache')
        .select('*')
        .in('ip_address', uniqueIPs);

      if (geoError) throw geoError;

      const geoMap = new Map((geoData || []).map(g => [g.ip_address, g]));

      const ipAttacks = new Map<string, { count: number; lastAttack: string; severity: string }>();

      threatEvents?.forEach(event => {
        if (!event.ip_address || !event.created_at) return;
        const existing = ipAttacks.get(event.ip_address);
        if (existing) {
          existing.count++;
          if (new Date(event.created_at) > new Date(existing.lastAttack)) {
            existing.lastAttack = event.created_at;
            existing.severity = event.severity;
          }
        } else {
          ipAttacks.set(event.ip_address, {
            count: 1,
            lastAttack: event.created_at,
            severity: event.severity
          });
        }
      });

      const results: AttackGeoPoint[] = [];
      ipAttacks.forEach((attacks, ip) => {
        const geo = geoMap.get(ip);
        if (geo?.latitude && geo?.longitude) {
          results.push({
            id: ip,
            ip_address: ip,
            country: geo.country_name || null,
            country_code: geo.country_code || null,
            city: geo.city || null,
            latitude: geo.latitude,
            longitude: geo.longitude,
            threat_score: geo.threat_score || null,
            is_vpn: geo.is_vpn || null,
            is_proxy: geo.is_proxy || null,
            is_tor: geo.is_tor || null,
            attack_count: attacks.count,
            last_attack: attacks.lastAttack,
            severity: attacks.severity as AttackGeoPoint['severity']
          });
        }
      });

      return results;
    },
    refetchInterval: 30000,
  });
}

export function useCountryAttackStats() {
  return useQuery({
    queryKey: ['country-attack-stats'],
    queryFn: async (): Promise<CountryAttackStats[]> => {
      const { data: geoData, error } = await supabase
        .from('ip_geo_cache')
        .select('country_name, country_code, threat_score, ip_address');

      if (error) throw error;

      const { data: threatEvents } = await supabase
        .from('threat_events')
        .select('ip_address')
        .not('ip_address', 'is', null);

      const ipAttackCounts = new Map<string, number>();
      threatEvents?.forEach(e => {
        if (e.ip_address) {
          ipAttackCounts.set(e.ip_address, (ipAttackCounts.get(e.ip_address) || 0) + 1);
        }
      });

      const countryStats = new Map<string, CountryAttackStats>();

      geoData?.forEach(geo => {
        if (!geo.country_code) return;

        const attacks = ipAttackCounts.get(geo.ip_address) || 0;
        const existing = countryStats.get(geo.country_code);

        if (existing) {
          existing.attack_count += attacks;
          existing.unique_ips++;
          existing.avg_threat_score = (existing.avg_threat_score * (existing.unique_ips - 1) + (geo.threat_score || 0)) / existing.unique_ips;
        } else {
          countryStats.set(geo.country_code, {
            country_code: geo.country_code,
            country: geo.country_name || 'Unknown',
            attack_count: attacks,
            unique_ips: 1,
            avg_threat_score: geo.threat_score || 0
          });
        }
      });

      return Array.from(countryStats.values())
        .filter(s => s.attack_count > 0)
        .sort((a, b) => b.attack_count - a.attack_count);
    },
    refetchInterval: 60000,
  });
}
