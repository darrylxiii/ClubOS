import { motion } from "framer-motion";
import { 
  Heart, 
  TrendingUp, 
  Zap, 
  Coffee, 
  DollarSign,
  Briefcase,
  Users,
  Home,
  Bike,
  GraduationCap
} from "lucide-react";
import { InteractiveCard } from "./InteractiveCard";

interface BenefitsShowcaseProps {
  benefits?: string[];
}

const benefitIcons: Record<string, any> = {
  health: Heart,
  growth: TrendingUp,
  energy: Zap,
  lifestyle: Coffee,
  compensation: DollarSign,
  work: Briefcase,
  team: Users,
  remote: Home,
  mobility: Bike,
  learning: GraduationCap,
};

const getBenefitIcon = (benefit: string) => {
  const lowerBenefit = benefit.toLowerCase();
  
  if (lowerBenefit.includes('health') || lowerBenefit.includes('insurance') || lowerBenefit.includes('medical')) {
    return Heart;
  }
  if (lowerBenefit.includes('career') || lowerBenefit.includes('growth') || lowerBenefit.includes('development')) {
    return TrendingUp;
  }
  if (lowerBenefit.includes('bonus') || lowerBenefit.includes('stock') || lowerBenefit.includes('equity') || lowerBenefit.includes('salary')) {
    return DollarSign;
  }
  if (lowerBenefit.includes('remote') || lowerBenefit.includes('home') || lowerBenefit.includes('hybrid')) {
    return Home;
  }
  if (lowerBenefit.includes('learning') || lowerBenefit.includes('training') || lowerBenefit.includes('education')) {
    return GraduationCap;
  }
  if (lowerBenefit.includes('team') || lowerBenefit.includes('social') || lowerBenefit.includes('culture')) {
    return Users;
  }
  
  return Zap;
};

const getBenefitCategory = (benefit: string) => {
  const lowerBenefit = benefit.toLowerCase();
  
  if (lowerBenefit.includes('health') || lowerBenefit.includes('insurance') || lowerBenefit.includes('medical')) {
    return { color: 'from-pink-500/20 to-rose-500/20', border: 'border-pink-500/30' };
  }
  if (lowerBenefit.includes('career') || lowerBenefit.includes('growth') || lowerBenefit.includes('development')) {
    return { color: 'from-blue-500/20 to-cyan-500/20', border: 'border-blue-500/30' };
  }
  if (lowerBenefit.includes('bonus') || lowerBenefit.includes('stock') || lowerBenefit.includes('equity') || lowerBenefit.includes('salary')) {
    return { color: 'from-green-500/20 to-emerald-500/20', border: 'border-green-500/30' };
  }
  if (lowerBenefit.includes('remote') || lowerBenefit.includes('home') || lowerBenefit.includes('hybrid')) {
    return { color: 'from-purple-500/20 to-violet-500/20', border: 'border-purple-500/30' };
  }
  
  return { color: 'from-accent/20 to-primary/20', border: 'border-accent/30' };
};

export function BenefitsShowcase({ benefits = [] }: BenefitsShowcaseProps) {
  if (benefits.length === 0) return null;

  return (
    <div className="space-y-6">
      <motion.h3 
        className="text-2xl font-bold flex items-center gap-2"
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
      >
        <span className="w-2 h-8 bg-gradient-to-b from-accent to-primary rounded-full" />
        Benefits & Perks
      </motion.h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {benefits.map((benefit, index) => {
          const Icon = getBenefitIcon(benefit);
          const category = getBenefitCategory(benefit);
          
          return (
            <InteractiveCard
              key={benefit}
              delay={index * 0.05}
              className="relative overflow-hidden group"
            >
              <div className="flex items-start gap-4">
                <motion.div
                  className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${category.color} border ${category.border} flex items-center justify-center`}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ duration: 0.3 }}
                >
                  <Icon className="w-6 h-6 text-foreground" />
                </motion.div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-foreground mb-1 group-hover:text-accent transition-colors">
                    {benefit}
                  </h4>
                </div>
              </div>

              {/* Animated gradient overlay on hover */}
              <motion.div
                className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`}
                initial={false}
              />
            </InteractiveCard>
          );
        })}
      </div>
    </div>
  );
}
