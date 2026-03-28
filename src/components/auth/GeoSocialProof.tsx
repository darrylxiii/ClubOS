import { ShieldCheck, ChevronRight } from "lucide-react";
import { useGeoLocale } from "@/hooks/useGeoLocale";

const GEO_SOCIAL_DATA: Record<string, { label: string; detail: string; companies: string[] }> = {
  NL: {
    label: "The Amsterdam Chapter",
    detail: "Currently capped at 500 Executive Members",
    companies: ["Adyen", "ASML", "Mistral AI", "Miro"],
  },
  GB: {
    label: "The London Syndicate",
    detail: "3.2% Acceptance Rate this quarter",
    companies: ["DeepMind", "Revolut", "Index Ventures", "Monzo"],
  },
  DE: {
    label: "The Berlin Alliance",
    detail: "Limited to 300 Executive Members",
    companies: ["Celonis", "Point Nine", "N26", "Aleph Alpha"],
  },
  US: {
    label: "The US Private Network",
    detail: "By exclusive invitation only",
    companies: ["OpenAI", "Stripe", "Anduril", "Sequoia"],
  },
  FR: {
    label: "The Paris Chapter",
    detail: "Elite private placements for 400 operators",
    companies: ["Mistral AI", "Hugging Face", "Dataiku", "Qonto"],
  },
  DEFAULT: {
    label: "The Global Syndicate",
    detail: "Access by nomination only",
    companies: ["DeepMind", "OpenAI", "Sequoia", "Stripe"],
  }
};

export const GeoSocialProof = () => {
  const { geoInfo } = useGeoLocale();
  const countryCode = geoInfo?.country || 'US';
  
  const data = GEO_SOCIAL_DATA[countryCode] || GEO_SOCIAL_DATA['DEFAULT'];

  return (
    <div className="w-full pt-6 pb-2 border-t border-border/40 mt-8">
      <div className="flex flex-col items-center justify-center space-y-4">
        
        <div className="flex flex-col items-center justify-center text-sm">
          <div className="flex items-center gap-1.5 text-foreground/90 font-medium tracking-wide">
            <ShieldCheck className="w-3.5 h-3.5 text-primary/80" />
            <span className="uppercase text-[11px] tracking-[0.2em]">{data.label}</span>
          </div>
          <span className="text-muted-foreground text-xs mt-1.5">
            {data.detail}
          </span>
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-5 opacity-50 grayscale hover:grayscale-0 transition-opacity duration-500 ease-in-out">
          {data.companies.map((company, index) => (
            <div key={index} className="flex items-center gap-1 text-[10px] font-semibold tracking-widest uppercase">
              <ChevronRight className="w-3 h-3 text-primary/40 -ml-1" />
              {company}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
