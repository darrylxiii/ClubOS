import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface SecurityConfigItem {
  id: string;
  config_key: string;
  config_value: Json;
  description: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface WhitelistedIP {
  ip: string;
  reason: string;
  added_at: string;
  added_by?: string;
}

export function useSecurityConfig() {
  return useQuery({
    queryKey: ['security-config'],
    queryFn: async (): Promise<SecurityConfigItem[]> => {
      const { data, error } = await supabase
        .from('security_config')
        .select('*')
        .order('config_key');

      if (error) throw error;
      return data || [];
    },
  });
}

export function useUpdateSecurityConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      configKey, 
      configValue 
    }: { 
      configKey: string; 
      configValue: Json;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('security_config')
        .upsert({
          config_key: configKey,
          config_value: configValue,
          updated_at: new Date().toISOString(),
          updated_by: user?.user?.id || null,
        }, {
          onConflict: 'config_key'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-config'] });
      toast.success('Security configuration updated');
    },
    onError: (error) => {
      toast.error('Failed to update configuration: ' + error.message);
    },
  });
}

export function useIPWhitelist() {
  const { data: config } = useSecurityConfig();
  
  const whitelist = config?.find(c => c.config_key === 'ip_whitelist');
  
  // Handle multiple formats: { ips: [...] }, [...], or null
  let ips: WhitelistedIP[] = [];
  if (whitelist?.config_value) {
    const value = whitelist.config_value as unknown;
    if (Array.isArray(value)) {
      ips = value as WhitelistedIP[];
    } else if (typeof value === 'object' && value !== null && 'ips' in value) {
      const obj = value as { ips: unknown };
      if (Array.isArray(obj.ips)) {
        ips = obj.ips as WhitelistedIP[];
      }
    }
  }
  
  return ips;
}

export function useAddToWhitelist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ip, reason }: { ip: string; reason: string }) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data: existing } = await supabase
        .from('security_config')
        .select('config_value')
        .eq('config_key', 'ip_whitelist')
        .single();

      const currentList = Array.isArray(existing?.config_value) 
        ? (existing.config_value as unknown as WhitelistedIP[])
        : [];
      
      if (currentList.some(item => item.ip === ip)) {
        throw new Error('IP already whitelisted');
      }

      const newList: WhitelistedIP[] = [
        ...currentList,
        {
          ip,
          reason,
          added_at: new Date().toISOString(),
          added_by: user?.user?.email || undefined,
        }
      ];

      const { error } = await supabase
        .from('security_config')
        .upsert({
          config_key: 'ip_whitelist',
          config_value: newList as unknown as Json,
          updated_at: new Date().toISOString(),
          updated_by: user?.user?.id || null,
        }, {
          onConflict: 'config_key'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-config'] });
      toast.success('IP added to whitelist');
    },
    onError: (error) => {
      toast.error('Failed to add IP: ' + error.message);
    },
  });
}

export function useRemoveFromWhitelist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ip: string) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data: existing } = await supabase
        .from('security_config')
        .select('config_value')
        .eq('config_key', 'ip_whitelist')
        .single();

      const currentList = Array.isArray(existing?.config_value)
        ? (existing.config_value as unknown as WhitelistedIP[])
        : [];
      const newList = currentList.filter(item => item.ip !== ip);

      const { error } = await supabase
        .from('security_config')
        .upsert({
          config_key: 'ip_whitelist',
          config_value: newList as unknown as Json,
          updated_at: new Date().toISOString(),
          updated_by: user?.user?.id || null,
        }, {
          onConflict: 'config_key'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-config'] });
      toast.success('IP removed from whitelist');
    },
    onError: (error) => {
      toast.error('Failed to remove IP: ' + error.message);
    },
  });
}
