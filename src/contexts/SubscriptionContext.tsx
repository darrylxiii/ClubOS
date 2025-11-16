import { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface SubscriptionContextType {
  hasActiveSubscription: boolean;
  subscriptions: any[];
  loading: boolean;
  refetch: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  // Optimized: Use React Query with 10min staleTime instead of 60s polling
  // Reduces unnecessary API calls from 1,440/day to ~144/day per user
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: async () => {
      if (!user) return { subscriptions: [] };

      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;
      return data;
    },
    enabled: !!user, // Only run query when user exists
    staleTime: 1000 * 60 * 10, // 10 minutes - subscription status doesn't change often
    gcTime: 1000 * 60 * 30, // 30 minutes cache
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchInterval: 1000 * 60 * 10, // Poll every 10 minutes instead of 60 seconds
  });

  const subscriptions = data?.subscriptions || [];

  return (
    <SubscriptionContext.Provider
      value={{
        hasActiveSubscription: subscriptions.length > 0,
        subscriptions,
        loading: isLoading,
        refetch: async () => {
          await refetch();
        },
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export const useSubscriptionContext = () => {
  const context = useContext(SubscriptionContext);
  if (!context) throw new Error('useSubscriptionContext must be used within SubscriptionProvider');
  return context;
};
