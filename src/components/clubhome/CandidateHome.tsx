import { NextBestActionCard } from "./NextBestActionCard";
import { ClubAIHomeChatWidget } from "./ClubAIHomeChatWidget";
import { PipelineSnapshot } from "./PipelineSnapshot";
import { CompactInterviewCountdown } from "./CompactInterviewCountdown";
import { CompactStrategist } from "./CompactStrategist";
import { DiscoveryGrid } from "./DiscoveryGrid";
import { CompactProfileStrength } from "./CompactProfileStrength";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

export const CandidateHome = () => {
  return (
    <div className="space-y-4 sm:space-y-5 max-w-4xl mx-auto">
      {/* 1. QUIN Next Best Action */}
      <ScrollReveal variant="fade-up">
        <NextBestActionCard />
      </ScrollReveal>

      {/* 2. Pipeline snapshot + optional interview countdown */}
      <ScrollReveal variant="fade-up" delay={0.05}>
        <PipelineSnapshot />
      </ScrollReveal>

      <CompactInterviewCountdown />

      {/* 3. Club AI chat */}
      <ScrollReveal variant="fade-up" delay={0.1}>
        <ClubAIHomeChatWidget />
      </ScrollReveal>

      {/* 4. Strategist (hidden if none assigned) */}
      <CompactStrategist />

      {/* 5. Discovery grid: For You / Saved / Messages */}
      <ScrollReveal variant="fade-scale" delay={0.15}>
        <DiscoveryGrid />
      </ScrollReveal>

      {/* 6. Profile strength (hidden at 100%) */}
      <CompactProfileStrength />
    </div>
  );
};
