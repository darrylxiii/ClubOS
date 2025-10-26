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
    <InteractiveCard className="space-y-6">
      <h3 className="text-2xl font-bold flex items-center gap-2">
        <span className="w-2 h-8 bg-gradient-to-b from-accent to-primary rounded-full" />
        Benefits & Perks
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {benefits.map((benefit) => {
          const Icon = getBenefitIcon(benefit);
          const category = getBenefitCategory(benefit);
          
          return (
            <div
              key={benefit}
              className={`flex items-start gap-3 p-4 rounded-lg border-2 ${category.border} bg-gradient-to-br ${category.color} hover:border-primary transition-all`}
            >
              <div className={`flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br ${category.color} border ${category.border} flex items-center justify-center`}>
                <Icon className="w-5 h-5 text-foreground" />
              </div>
              
              <span className="flex-1 font-medium text-foreground">
                {benefit}
              </span>
            </div>
          );
        })}
      </div>
    </InteractiveCard>
  );
}
