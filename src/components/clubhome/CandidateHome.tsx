import { NextBestActionCard } from "./NextBestActionCard";
import { ClubAIHomeChatWidget } from "./ClubAIHomeChatWidget";
import { PipelineSnapshot } from "./PipelineSnapshot";
import { CompactInterviewCountdown } from "./CompactInterviewCountdown";
import { CompactStrategist } from "./CompactStrategist";
import { DiscoveryGrid } from "./DiscoveryGrid";
import { CompactProfileStrength } from "./CompactProfileStrength";
import { motion } from "framer-motion";

const fade = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.25 },
};

export const CandidateHome = () => {
  return (
    <div className="space-y-4 sm:space-y-5 max-w-4xl mx-auto">
      {/* 1. QUIN Next Best Action */}
      <motion.div {...fade}>
        <NextBestActionCard />
      </motion.div>

      {/* 2. Pipeline snapshot + optional interview countdown */}
      <motion.div {...fade} transition={{ ...fade.transition, delay: 0.05 }}>
        <PipelineSnapshot />
      </motion.div>

      <CompactInterviewCountdown />

      {/* 3. Club AI chat */}
      <motion.div {...fade} transition={{ ...fade.transition, delay: 0.1 }}>
        <ClubAIHomeChatWidget />
      </motion.div>

      {/* 4. Strategist (hidden if none assigned) */}
      <CompactStrategist />

      {/* 5. Discovery grid: For You / Saved / Messages */}
      <motion.div {...fade} transition={{ ...fade.transition, delay: 0.15 }}>
        <DiscoveryGrid />
      </motion.div>

      {/* 6. Profile strength (hidden at 100%) */}
      <CompactProfileStrength />
    </div>
  );
};
