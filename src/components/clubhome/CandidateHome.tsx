import { NextBestActionCard } from "./NextBestActionCard";
import { ClubAIHomeChatWidget } from "./ClubAIHomeChatWidget";
import { PipelineSnapshot } from "./PipelineSnapshot";
import { CompactInterviewCountdown } from "./CompactInterviewCountdown";
import { CompactStrategist } from "./CompactStrategist";
import { DiscoveryGrid } from "./DiscoveryGrid";
import { CompactProfileStrength } from "./CompactProfileStrength";
import { UpcomingMeetingsWidget } from "./UpcomingMeetingsWidget";
import { ApplicationActivityFeed } from "./ApplicationActivityFeed";

import { ScrollReveal } from "@/components/ui/scroll-reveal";

export const CandidateHome = () => {
  return (
    <div className="space-y-4 sm:space-y-5">
      {/* 1. QUIN Next Best Action */}
      <ScrollReveal variant="fade-up">
        <NextBestActionCard />
      </ScrollReveal>

      {/* 2. Pipeline snapshot + optional interview countdown */}
      <ScrollReveal variant="fade-up" delay={0.05}>
        <PipelineSnapshot />
      </ScrollReveal>

      <CompactInterviewCountdown />

      {/* 2.5. Upcoming Meetings */}
      <ScrollReveal variant="fade-up" delay={0.08}>
        <UpcomingMeetingsWidget />
      </ScrollReveal>

      {/* 3. Club AI chat */}
      <ScrollReveal variant="fade-up" delay={0.1}>
        <ClubAIHomeChatWidget />
      </ScrollReveal>

      {/* 3.5. Application Activity Feed */}
      <ScrollReveal variant="fade-up" delay={0.12}>
        <ApplicationActivityFeed />
      </ScrollReveal>

      {/* 4. Strategist (hidden if none assigned) */}
      <CompactStrategist />

      {/* 5. Discovery grid: For You / Saved / Messages */}
      <ScrollReveal variant="fade-scale" delay={0.15}>
        <DiscoveryGrid />
      </ScrollReveal>

      {/* Referral Network — widget re-enabled once candidate_referrals table ships */}

      {/* 6. Profile strength (hidden at 100%) */}
      <CompactProfileStrength />
    </div>
  );
};
