import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";

interface SlotRecommendation {
  time_slot: string;
  score: number;
  reason: string;
}

interface SmartSlotRecommendationProps {
  bookingLinkId: string;
  date: Date;
  slotStart: string;
}

/**
 * Checks if a given slot is "recommended" based on historical analytics
 * (booking_slot_analytics: popular times + high show-up rates).
 */
export function useSmartRecommendations(bookingLinkId: string, date: Date | null) {
  const [recommendations, setRecommendations] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!date || !bookingLinkId) return;

    const dayOfWeek = date.getDay();
    
    // Query slot analytics for this booking link to find popular + high show-rate slots
    const fetchRecommendations = async () => {
      const { data } = await supabase
        .from("booking_slot_analytics")
        .select("time_slot, bookings_count, show_rate, popularity_score")
        .eq("booking_link_id", bookingLinkId)
        .eq("day_of_week", dayOfWeek)
        .order("popularity_score", { ascending: false })
        .limit(3);

      if (data && data.length > 0) {
        const topSlots = new Set(data.map((d: any) => d.time_slot as string));
        setRecommendations(topSlots);
      }
    };

    fetchRecommendations();
  }, [bookingLinkId, date]);

  return recommendations;
}

export function SmartSlotBadge({ isRecommended }: { isRecommended: boolean }) {
  const { t } = useTranslation('common');
  if (!isRecommended) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="secondary"
            className="ml-auto text-[10px] px-1.5 py-0 gap-0.5 bg-primary/10 text-primary border-primary/20"
          >
            <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
            {t('booking.popular', 'Popular')}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="left" className="text-xs max-w-48">
          <p>{t('booking.popularTooltip', 'Historically popular time with high attendance. Powered by QUIN.')}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
