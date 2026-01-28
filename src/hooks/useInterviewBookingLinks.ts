import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface InterviewBookingLink {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  user_id: string;
  is_active: boolean;
  advance_booking_days: number | null;
  min_notice_hours: number | null;
  host_name?: string;
  host_avatar?: string;
}

interface UseInterviewBookingLinksParams {
  applicationId: string;
  companyId?: string;
  jobId?: string;
}

/**
 * Hook to fetch available booking links for interview scheduling
 * Gets active booking links with "interview" in the title
 */
export function useInterviewBookingLinks({ 
  applicationId, 
}: UseInterviewBookingLinksParams) {
  return useQuery({
    queryKey: ["interview-booking-links", applicationId],
    queryFn: async (): Promise<InterviewBookingLink[]> => {
      // Get active booking links with "interview" in the title
      const { data: links, error } = await supabase
        .from("booking_links")
        .select(`
          id,
          slug,
          title,
          description,
          duration_minutes,
          user_id,
          is_active,
          advance_booking_days,
          min_notice_hours
        `)
        .eq("is_active", true)
        .limit(10);

      if (error || !links) {
        console.error("Error fetching booking links:", error);
        return [];
      }

      // Filter for interview-related links
      const interviewLinks = links.filter(link => 
        link.title?.toLowerCase().includes("interview") ||
        link.title?.toLowerCase().includes("meeting") ||
        link.title?.toLowerCase().includes("call")
      );

      // Get unique user IDs
      const userIds = [...new Set(interviewLinks.map(l => l.user_id))];
      
      // Fetch host profiles
      let profileMap = new Map<string, { name: string | null; avatar: string | null }>();
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", userIds);

        profileMap = new Map(
          profiles?.map(p => [p.id, { name: p.full_name, avatar: p.avatar_url }]) || []
        );
      }

      return interviewLinks.map(link => ({
        ...link,
        host_name: profileMap.get(link.user_id)?.name || "TQC Host",
        host_avatar: profileMap.get(link.user_id)?.avatar || undefined,
      }));
    },
    enabled: !!applicationId,
    staleTime: 5 * 60 * 1000,
  });
}
