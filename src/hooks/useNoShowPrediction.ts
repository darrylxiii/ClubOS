import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface NoShowPrediction {
  id: string;
  booking_id: string;
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  prediction_factors: {
    domainHistory: number;
    leadTime: number;
    timeOfDay: number;
    dayOfWeek: number;
    guestCount: number;
    hasPhone: number;
    recaptchaScore: number;
    weights: Record<string, number>;
    domain: string;
    domainTotalBookings: number;
    domainNoShowRate: number | null;
  };
  intervention_triggered: boolean;
  intervention_type: string | null;
  created_at: string;
}

export function useNoShowPrediction(bookingId?: string) {
  const queryClient = useQueryClient();

  // Fetch prediction for a specific booking
  const {
    data: prediction,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['no-show-prediction', bookingId],
    queryFn: async () => {
      if (!bookingId) return null;

      const { data, error } = await supabase
        .from('booking_no_show_predictions')
        .select('*')
        .eq('booking_id', bookingId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data as NoShowPrediction | null;
    },
    enabled: !!bookingId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Generate prediction for a booking
  const generatePrediction = useMutation({
    mutationFn: async (targetBookingId: string) => {
      const { data, error } = await supabase.functions.invoke('predict-no-show', {
        body: { bookingId: targetBookingId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, targetBookingId) => {
      queryClient.invalidateQueries({ queryKey: ['no-show-prediction', targetBookingId] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });

  return {
    prediction,
    isLoading,
    error,
    refetch,
    generatePrediction: generatePrediction.mutate,
    isGenerating: generatePrediction.isPending,
  };
}

// Hook to fetch predictions for multiple bookings
export function useNoShowPredictions(bookingIds: string[]) {
  return useQuery({
    queryKey: ['no-show-predictions', bookingIds],
    queryFn: async () => {
      if (!bookingIds.length) return {};

      const { data, error } = await supabase
        .from('booking_no_show_predictions')
        .select('*')
        .in('booking_id', bookingIds);

      if (error) throw error;

      // Create a map for easy lookup
      const predictionMap: Record<string, NoShowPrediction> = {};
      data?.forEach((pred) => {
        predictionMap[pred.booking_id] = pred as NoShowPrediction;
      });

      return predictionMap;
    },
    enabled: bookingIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

// Hook for domain behavior patterns (for analytics)
export function useDomainBehaviorPatterns() {
  return useQuery({
    queryKey: ['domain-behavior-patterns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('booking_behavior_patterns')
        .select('*')
        .order('total_bookings', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
