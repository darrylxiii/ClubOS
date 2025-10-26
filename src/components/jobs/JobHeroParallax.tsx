import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Briefcase, DollarSign, Bookmark, Share2, CheckCircle2 } from "lucide-react";
import { MatchScoreRing } from "./MatchScoreRing";
import { useParallax } from "@/hooks/useParallax";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";

interface JobHeroParallaxProps {
  title: string;
  company: {
    name: string;
    slug?: string;
    logo_url?: string;
    cover_image_url?: string;
  };
  location?: string;
  employment_type?: string;
  salary_min?: number;
  salary_max?: number;
  currency?: string;
  matchScore?: number;
  isSaved: boolean;
  isApplied: boolean;
  onApply: () => void;
  onSave: () => void;
  onShare: () => void;
}

export function JobHeroParallax({
  title,
  company,
  location,
  employment_type,
  salary_min,
  salary_max,
  currency = "EUR",
  matchScore,
  isSaved,
  isApplied,
  onApply,
  onSave,
  onShare,
}: JobHeroParallaxProps) {
  const navigate = useNavigate();
  const parallaxOffset = useParallax(0.5);
  const [isApplying, setIsApplying] = useState(false);

  const handleApplyClick = async () => {
    setIsApplying(true);
    await onApply();
    setIsApplying(false);
    
    // Confetti celebration
    if (!isApplied) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['hsl(var(--accent))', 'hsl(var(--primary))', 'hsl(var(--chart-2))']
      });
    }
  };

  const formatSalary = () => {
    if (!salary_min && !salary_max) return null;
    const symbol = currency === "EUR" ? "€" : "$";
    if (salary_min && salary_max) {
      return `${symbol}${(salary_min / 1000).toFixed(0)}K - ${symbol}${(salary_max / 1000).toFixed(0)}K`;
    }
    return salary_min ? `${symbol}${(salary_min / 1000).toFixed(0)}K+` : null;
  };

  const getEmploymentTypeLabel = (type?: string) => {
    const labels: Record<string, string> = {
      full_time: "Full-time",
      part_time: "Part-time",
      contract: "Contract",
      freelance: "Freelance",
    };
    return type ? labels[type] || type : null;
  };

  return (
    <div className="relative w-full overflow-hidden">
      {/* Parallax Cover Image */}
      <motion.div 
        className="absolute inset-0 h-[600px]"
        style={{ y: parallaxOffset }}
        initial={{ scale: 1.1 }}
        animate={{ scale: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      >
        <div
          className="w-full h-full bg-cover bg-center"
          style={{
            backgroundImage: company.cover_image_url
              ? `url(${company.cover_image_url})`
              : 'linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--accent) / 0.1))',
          }}
        />
        {/* Gradient overlay that darkens on scroll */}
        <motion.div 
          className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background"
          style={{
            opacity: Math.min(1, parallaxOffset / 200),
          }}
        />
      </motion.div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 pt-24 pb-16">
        <div className="max-w-5xl mx-auto">
          {/* Company Logo with 3D Tilt Effect */}
          <motion.div
            className="mb-8 inline-block"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
            whileHover={{ 
              scale: 1.05,
              rotateY: 5,
              rotateX: 5,
            }}
            style={{ perspective: 1000 }}
          >
            <div 
              className={cn(
                "w-24 h-24 rounded-2xl overflow-hidden border-2 transition-all duration-300",
                "shadow-2xl cursor-pointer",
                matchScore && matchScore >= 80 && "border-chart-2 shadow-[0_0_30px_hsl(var(--chart-2)/0.3)]",
                matchScore && matchScore >= 60 && matchScore < 80 && "border-accent shadow-[0_0_30px_hsl(var(--accent)/0.3)]",
                (!matchScore || matchScore < 60) && "border-primary shadow-[0_0_30px_hsl(var(--primary)/0.2)]"
              )}
              onClick={() => company.slug && navigate(`/companies/${company.slug}`)}
            >
              {company.logo_url ? (
                <img
                  src={company.logo_url}
                  alt={company.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <span className="text-3xl font-bold text-primary-foreground">
                    {company.name.charAt(0)}
                  </span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Job Title with Animated Gradient */}
          <motion.h1
            className="text-5xl md:text-7xl font-bold mb-4 leading-tight"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {title.split(' ').map((word, index) => (
              <motion.span
                key={index}
                className="inline-block mr-3 bg-gradient-to-br from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent shimmer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
              >
                {word}
              </motion.span>
            ))}
          </motion.h1>

          {/* Company Name */}
          <motion.p
            className="text-xl text-muted-foreground mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            at{" "}
            <span 
              className="font-semibold text-foreground hover:text-accent transition-colors cursor-pointer"
              onClick={() => company.slug && navigate(`/companies/${company.slug}`)}
            >
              {company.name}
            </span>
          </motion.p>

          {/* Info Badges with Animated Icons */}
          <motion.div
            className="flex flex-wrap gap-3 mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            {location && (
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Badge variant="secondary" className="px-4 py-2 text-sm gap-2 glass-subtle">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  >
                    <MapPin className="w-4 h-4" />
                  </motion.div>
                  {location}
                </Badge>
              </motion.div>
            )}
            
            {employment_type && (
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Badge variant="secondary" className="px-4 py-2 text-sm gap-2 glass-subtle">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  >
                    <Briefcase className="w-4 h-4" />
                  </motion.div>
                  {getEmploymentTypeLabel(employment_type)}
                </Badge>
              </motion.div>
            )}
            
            {formatSalary() && (
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Badge variant="secondary" className="px-4 py-2 text-sm gap-2 glass-subtle">
                  <motion.div
                    animate={{ y: [0, -2, 0] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  >
                    <DollarSign className="w-4 h-4" />
                  </motion.div>
                  {formatSalary()}
                </Badge>
              </motion.div>
            )}
          </motion.div>

          {/* Match Score and CTAs */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {matchScore !== undefined && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.2, type: "spring" }}
              >
                <MatchScoreRing score={matchScore} />
              </motion.div>
            )}

            {/* CTA Buttons with Ripple Effect */}
            <motion.div
              className="flex flex-wrap gap-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.4 }}
            >
              <Button
                size="lg"
                onClick={handleApplyClick}
                disabled={isApplied || isApplying}
                className="relative overflow-hidden group px-8 py-6 text-base"
              >
                <motion.span
                  className="relative z-10 flex items-center gap-2"
                  whileHover={{ scale: 1.05 }}
                >
                  {isApplied ? (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      Applied
                    </>
                  ) : (
                    'Apply Now'
                  )}
                </motion.span>
                {!isApplied && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary"
                    initial={{ x: '-100%' }}
                    whileHover={{ x: '100%' }}
                    transition={{ duration: 0.6 }}
                  />
                )}
              </Button>

              <Button
                size="lg"
                variant="outline"
                onClick={onSave}
                className="px-6 py-6 gap-2 glass-subtle"
              >
                <motion.div
                  animate={isSaved ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  <Bookmark className={cn("w-5 h-5", isSaved && "fill-current")} />
                </motion.div>
                {isSaved ? 'Saved' : 'Save'}
              </Button>

              <Button
                size="lg"
                variant="outline"
                onClick={onShare}
                className="px-6 py-6 glass-subtle"
              >
                <Share2 className="w-5 h-5" />
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
