import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Quote } from "lucide-react";

export function SocialProofCarousel() {
  const { t } = useTranslation('onboarding');
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    loadTestimonials();
  }, []);

  useEffect(() => {
    if (testimonials.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [testimonials]);

  const loadTestimonials = async () => {
    const { data } = await supabase
      .from("funnel_config")
      .select("social_proof_items")
      .single();

    if (data?.social_proof_items) {
      setTestimonials(data.social_proof_items as any[]);
    }
  };

  if (testimonials.length === 0) return null;

  return (
    <Card className="p-8 glass-effect">
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
