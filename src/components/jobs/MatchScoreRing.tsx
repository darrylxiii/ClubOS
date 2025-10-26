import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface MatchScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showTooltip?: boolean;
}

export function MatchScoreRing({ 
  score, 
  size = 120, 
  strokeWidth = 8, 
  className,
  showTooltip = true 
}: MatchScoreRingProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  
  // Animate score from 0 to target
  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const increment = score / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= score) {
        setAnimatedScore(score);
        clearInterval(timer);
      } else {
        setAnimatedScore(Math.floor(current));
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [score]);
  
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;
  
  // Color based on score
  const getScoreColor = (score: number) => {
    if (score >= 80) return "hsl(var(--chart-2))"; // Green
    if (score >= 60) return "hsl(var(--accent))"; // Gold
    return "hsl(var(--destructive))"; // Red
  };
  
  const getScoreGlow = (score: number) => {
    if (score >= 80) return "shadow-[0_0_20px_hsl(var(--chart-2)/0.4)]";
    if (score >= 60) return "shadow-[0_0_20px_hsl(var(--accent)/0.4)]";
    return "shadow-[0_0_20px_hsl(var(--destructive)/0.4)]";
  };

  return (
    <motion.div 
      className={cn("relative inline-flex items-center justify-center", className)}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, ease: "backOut" }}
    >
      <svg
        width={size}
        height={size}
        className={cn("transform -rotate-90 transition-shadow duration-300", getScoreGlow(animatedScore))}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          fill="none"
          opacity={0.2}
        />
        
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getScoreColor(animatedScore)}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      </svg>
      
      {/* Score text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span 
          className="text-3xl font-bold bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {animatedScore}%
        </motion.span>
        <motion.span 
          className="text-xs text-muted-foreground mt-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          Match
        </motion.span>
      </div>
      
      {/* QUIN badge */}
      <motion.div 
        className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-background/80 backdrop-blur-sm border border-border/50 rounded-full"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
      >
        <span className="text-[10px] text-muted-foreground font-medium">Powered by QUIN</span>
      </motion.div>
      
      {/* Pulse animation */}
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-accent/30"
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.5, 0, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </motion.div>
  );
}
