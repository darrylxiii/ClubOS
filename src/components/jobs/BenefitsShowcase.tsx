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
  GraduationCap,
  Gift,
  ChevronDown
} from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { cn } from "@/lib/utils";

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
  const [isOpen, setIsOpen] = useState(false);
  
  if (benefits.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-2 hover:border-primary transition-all hover-scale">
        <CollapsibleTrigger className="w-full">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 text-left">
                <Gift className="w-6 h-6 text-primary flex-shrink-0" />
                <div>
                  <h3 className="text-xl font-black">Benefits & Perks</h3>
                  <p className="text-sm text-muted-foreground">
                    {benefits.length} benefits included
                  </p>
                </div>
              </div>
              <ChevronDown
                className={cn(
                  "w-6 h-6 transition-transform flex-shrink-0",
                  isOpen && "rotate-180"
                )}
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="border-t pt-6">
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
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
