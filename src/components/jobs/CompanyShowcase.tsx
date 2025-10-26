import { motion } from "framer-motion";
import { useParallax } from "@/hooks/useParallax";
import { useInView } from "@/hooks/useInView";
import { InteractiveCard } from "./InteractiveCard";
import { 
  Building2, 
  Users, 
  TrendingUp, 
  Globe,
  MapPin,
  Calendar,
  Briefcase,
  Award
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

interface CompanyShowcaseProps {
  company?: {
    name: string;
    description?: string;
    tagline?: string;
    industry?: string;
    company_size?: string;
    headquarters_location?: string;
    website_url?: string;
    founded_year?: number;
    funding_stage?: string;
  };
}

// Animated counter component
function AnimatedCounter({ value, suffix = "", duration = 2000 }: { value: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const { isInView, elementRef } = useInView({ threshold: 0.5 });

  useEffect(() => {
    if (!isInView) return;

    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      // Easing function
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeOutQuart * value));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [isInView, value, duration]);

  return (
    <span ref={elementRef}>
      {count}
      {suffix}
    </span>
  );
}

export function CompanyShowcase({ company }: CompanyShowcaseProps) {
  const parallaxOffset = useParallax(0.3);

  if (!company) return null;

  // Mock data for stats (in real app, this would come from API)
  const stats = [
    { label: "Employees", value: company.company_size || "50-200", icon: Users },
    { label: "Founded", value: company.founded_year || "2020", icon: Calendar },
    { label: "Industry", value: company.industry || "Technology", icon: Briefcase },
    { label: "Stage", value: company.funding_stage || "Series A", icon: TrendingUp },
  ];

  return (
    <div className="space-y-12">
      {/* Company Hero Mini-Section */}
      <div className="relative overflow-hidden rounded-2xl">
        {/* Parallax background */}
        <motion.div
          className="absolute inset-0 h-64"
          style={{ y: parallaxOffset }}
        >
          <div className="w-full h-full bg-gradient-to-br from-primary/20 via-accent/10 to-chart-2/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        </motion.div>

        {/* Content */}
        <div className="relative z-10 p-8 md:p-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-8 bg-gradient-to-b from-primary to-accent rounded-full" />
              <h2 className="text-3xl md:text-4xl font-bold">
                About {company.name}
              </h2>
            </div>
            
            {company.tagline && (
              <p className="text-xl text-muted-foreground font-light italic">
                "{company.tagline}"
              </p>
            )}
          </motion.div>
        </div>
      </div>

      {/* Company Description - Editorial Layout */}
      {company.description && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative"
        >
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <p className="text-foreground/90 leading-relaxed text-lg font-serif">
              {company.description.split('\n').map((paragraph, index) => (
                <span key={index}>
                  {paragraph}
                  {index < company.description!.split('\n').length - 1 && <><br /><br /></>}
                </span>
              ))}
            </p>
          </div>

          {/* Pull quote decoration */}
          <motion.div
            className="absolute -left-4 top-0 w-1 h-24 bg-gradient-to-b from-accent to-primary rounded-full"
            initial={{ height: 0 }}
            whileInView={{ height: 96 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          />
        </motion.div>
      )}

      {/* Company Stats Grid - Animated Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          
          return (
            <InteractiveCard
              key={stat.label}
              delay={index * 0.1}
              className="text-center"
            >
              <motion.div
                className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 mb-3"
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
              >
                <Icon className="w-6 h-6 text-primary" />
              </motion.div>
              
              <div className="text-2xl font-bold mb-1 text-gradient-accent">
                {typeof stat.value === 'number' ? (
                  <AnimatedCounter value={stat.value} />
                ) : (
                  stat.value
                )}
              </div>
              
              <div className="text-sm text-muted-foreground">
                {stat.label}
              </div>
            </InteractiveCard>
          );
        })}
      </div>

      {/* Company Info Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Location */}
        {company.headquarters_location && (
          <InteractiveCard className="relative overflow-hidden">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 flex items-center justify-center">
                <MapPin className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">Headquarters</h4>
                <p className="text-muted-foreground">{company.headquarters_location}</p>
              </div>
            </div>
          </InteractiveCard>
        )}

        {/* Website */}
        {company.website_url && (
          <InteractiveCard className="relative overflow-hidden">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-violet-500/20 border border-purple-500/30 flex items-center justify-center">
                <Globe className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">Website</h4>
                <a
                  href={company.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  Visit Website →
                </a>
              </div>
            </div>
          </InteractiveCard>
        )}
      </div>

      {/* Growth Trajectory - Visual indicator */}
      <InteractiveCard className="bg-gradient-to-br from-chart-2/5 to-chart-1/5 border-chart-2/30">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <Award className="w-5 h-5 text-chart-2" />
              <h4 className="font-semibold text-foreground">Why Join Now?</h4>
            </div>
            <p className="text-muted-foreground mb-4">
              {company.name} is in a growth phase, offering unique opportunities to make an impact 
              and grow with the company.
            </p>
            
            {/* Growth indicators */}
            <div className="flex gap-2">
              <span className="px-3 py-1 text-xs font-medium bg-chart-2/20 text-chart-2 rounded-full border border-chart-2/30">
                Expanding Team
              </span>
              <span className="px-3 py-1 text-xs font-medium bg-accent/20 text-accent rounded-full border border-accent/30">
                High Impact
              </span>
            </div>
          </div>

          {/* Decorative growth chart */}
          <motion.div
            className="hidden md:block"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <svg width="120" height="80" viewBox="0 0 120 80" fill="none">
              <motion.path
                d="M 0 60 Q 30 40, 60 30 T 120 10"
                stroke="hsl(var(--chart-2))"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 2, ease: "easeOut" }}
              />
              {/* Data points */}
              {[0, 40, 65, 100].map((x, i) => (
                <motion.circle
                  key={i}
                  cx={x * 1.2}
                  cy={60 - i * 15}
                  r="4"
                  fill="hsl(var(--chart-2))"
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.2, type: "spring" }}
                />
              ))}
            </svg>
          </motion.div>
        </div>
      </InteractiveCard>

      {/* Culture Section (placeholder for future expansion) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center p-8 rounded-xl border border-border/50 bg-muted/20"
      >
        <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h4 className="font-semibold text-foreground mb-2">Learn More About Our Culture</h4>
        <p className="text-sm text-muted-foreground">
          Discover what it's like to work at {company.name} by connecting with our team
        </p>
      </motion.div>
    </div>
  );
}
