export type ThreatEventType = 
  | 'brute_force' 
  | 'credential_stuffing' 
  | 'enumeration' 
  | 'rate_abuse' 
  | 'suspicious_login' 
  | 'impossible_travel' 
  | 'known_bad_ip';

export type ThreatSeverity = 'low' | 'medium' | 'high' | 'critical';

export type BlockType = 
  | 'manual' 
  | 'auto_brute_force' 
  | 'auto_rate_limit' 
  | 'auto_suspicious' 
  | 'auto_enumeration';

export type ThreatLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ThreatEvent {
  id: string;
  event_type: ThreatEventType;
  severity: ThreatSeverity;
  ip_address: string | null;
  user_id: string | null;
  email: string | null;
  description: string | null;
  attack_details: Record<string, any>;
  is_resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BlockedIP {
  id: string;
  ip_address: string;
  block_type: BlockType;
  reason: string | null;
  blocked_by: string | null;
  blocked_at: string;
  expires_at: string | null;
  is_active: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface IPGeoCache {
  ip_address: string;
  country_code: string | null;
  country_name: string | null;
  city: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  is_vpn: boolean;
  is_proxy: boolean;
  is_tor: boolean;
  isp: string | null;
  threat_score: number;
  last_updated: string;
}

export interface ThreatSummary {
  total_threats_24h: number;
  critical_threats: number;
  high_threats: number;
  medium_threats: number;
  blocked_ips_active: number;
  blocked_ips_today: number;
  attacks_by_type: Record<string, number>;
  threat_level: ThreatLevel;
}

export interface SecurityConfig {
  id: string;
  config_key: string;
  config_value: Record<string, any>;
  description: string | null;
  updated_by: string | null;
  updated_at: string;
}
