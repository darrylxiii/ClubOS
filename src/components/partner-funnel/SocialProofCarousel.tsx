import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Quote, Users, Briefcase, Clock } from "lucide-react";

interface LiveStats {
  partnerships_this_month?: number;
  active_roles?: number;
  avg_response_hours?: number;
}

export function SocialProofCarousel() {
  const { t } = useTranslation('onboarding');
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [liveStats, setLiveStats] = useState<LiveStats>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasRealTestimonials, setHasRealTestimonials] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!hasRealTestimonials || testimonials.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [testimonials, hasRealTestimonials]);

  const loadData = async () => {
    const { data } = await supabase
      .from("funnel_config")
      .select("social_proof_items, live_stats")
      .single();

    if (data?.live_stats) {
      setLiveStats(data.live_stats as LiveStats);
    }

    if (data?.social_proof_items) {
      const items = data.social_proof_items as any[];
      const placeholders = ['techcorp', 'innovateco', 'futurelabs', 'placeholder'];
      const isReal = items.length > 0 && !items.some(item =>
        placeholders.some(p => (item.company || '').toLowerCase().includes(p))
      );
      setHasRealTestimonials(isReal);
      if (isReal) {
        setTestimonials(items);
      }
    }
  };

  // Stats-based proof (always available, uses real data from funnel_config)
  const statsBar = (
    <div className="flex items-center justify-center gap-6 sm:gap-10 py-4 text-sm text-muted-foreground">
      {liveStats.active_roles != null && liveStats.active_roles > 0 && (
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-primary" />
          <span><strong className="text-foreground">{liveStats.active_roles}</strong>{t("active_roles", "active roles")}</span>
        </div>
      )}
      {liveStats.partnerships_this_month != null && liveStats.partnerships_this_month > 0 && (
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <span><strong className="text-foreground">{liveStats.partnerships_this_month}</strong> partnerships</span>
        </div>
      )}
      {liveStats.avg_response_hours != null && liveStats.avg_response_hours > 0 && (
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <span>Avg response: <strong className="text-foreground">{liveStats.avg_response_hours}h</strong></span>
        </div>
      )}
    </div>
  );

  if (!hasRealTestimonials) {
    const hasStats = (liveStats.active_roles || 0) > 0 || (liveStats.partnerships_this_month || 0) > 0;
    if (!hasStats) return null;
    return statsBar;
  }

  return (
    <Card className="p-8 glass">
      <div className="text-center">
        <Quote className="w-10 h-10 text-primary mx-auto mb-4" />
        <blockquote className="text-lg font-medium mb-4">
          "{testimonials[currentIndex]?.testimonial}"
        </blockquote>
        <div className="flex items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <span className="font-bold text-primary">
              {testimonials[currentIndex]?.company?.[0]}
            </span>
          </div>
          <div className="text-left">
            <div className="font-semibold">{testimonials[currentIndex]?.company}</div>
            <div className="text-sm text-muted-foreground">{t('candidate.socialProof.partnerCompany', 'Partner Company')}</div>
          </div>
        </div>
        <div className="flex justify-center gap-2 mt-6">
          {testimonials.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex ? "bg-primary w-6" : "bg-muted"
              }`}
            />
          ))}
        </div>
      </div>
    </Card>
  );
}
