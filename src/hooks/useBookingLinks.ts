import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface BookingLink {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  advance_booking_days: number;
  min_notice_hours: number;
  is_active: boolean;
  color: string;
  created_at: string;
  scheduling_type: string;
  video_conferencing_provider: string | null;
  auto_generate_meeting_link: boolean;
  allow_waitlist: boolean;
  single_use: boolean;
  max_uses: number | null;
  requires_approval: boolean;
  max_bookings_per_day: number | null;
}

export interface Booking {
  id: string;
  guest_name: string;
  guest_email: string;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
  created_at: string;
}

export function useBookingLinks() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['booking-links', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('booking_links')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as BookingLink[];
    },
    enabled: !!user?.id,
  });
}

export function useUpcomingBookings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['upcoming-bookings', user?.id],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', user?.id)
        .gte('scheduled_start', now)
        .eq('status', 'confirmed')
        .order('scheduled_start', { ascending: true })
        .limit(10);

      if (error) throw error;
      return (data || []) as Booking[];
    },
    enabled: !!user?.id,
  });
}

export function usePendingBookingsCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['pending-bookings-count', user?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id)
        .eq('status', 'pending_approval');

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.id,
  });
}

export function useConnectedCalendars() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['connected-calendars', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('calendar_connections')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });
}

export function useCreateBookingLink() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (linkData: Record<string, unknown>) => {
      const { data, error } = await supabase
        .from('booking_links')
        .insert([{ ...linkData, user_id: user?.id }] as never)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-links'] });
      toast.success('Booking link created');
    },
    onError: (error: { code?: string }) => {
      if (error.code === '23505') {
        toast.error('This URL is already taken');
      } else {
        toast.error('Failed to create booking link');
      }
    },
  });
}

export function useToggleBookingLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('booking_links')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-links'] });
      toast.success('Link updated');
    },
    onError: () => toast.error('Failed to update link'),
  });
}

export function useDeleteBookingLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('booking_links')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-links'] });
      toast.success('Booking link deleted');
    },
    onError: () => toast.error('Failed to delete booking link'),
  });
}
