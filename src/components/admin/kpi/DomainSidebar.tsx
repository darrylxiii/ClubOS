import React from 'react';
import { cn } from '@/lib/utils';
import { 
  Building2, 
  Globe, 
  DollarSign, 
  ChevronDown, 
  ChevronRight,
  LayoutDashboard,
  Clock,
  BarChart3,
  Users,
  Heart,
  Gauge,
  Wallet,
  Brain,
  TrendingUp,
  Share2,
  Sparkles,
  RotateCcw,
  Target,
  MessageSquare,
  Phone,
  FileText,
  Bot,
  Server,
  Zap,
  Activity,
  AlertTriangle,
  LineChart,
  Briefcase,
  CreditCard,
  Shield
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { DomainHealth, KPIDomain } from '@/hooks/useUnifiedKPIs';

interface DomainSidebarProps {
  domainHealth: DomainHealth[];
  selectedCategory: string | null;
  onSelectCategory: (domain: KPIDomain, category: string | null) => void;
  onSelectOverview: () => void;
}

const domainIcons: Record<KPIDomain, React.ElementType> = {
  operations: Building2,
  website: Globe,
  sales: DollarSign,
  platform: Server,
  intelligence: Brain,
  growth: TrendingUp,
};

const domainColors: Record<KPIDomain, string> = {
  operations: 'text-blue-500',
  website: 'text-purple-500',
  sales: 'text-amber-500',
  platform: 'text-emerald-500',
  intelligence: 'text-pink-500',
  growth: 'text-cyan-500',
};

const categoryIcons: Record<string, React.ElementType> = {
  // Operations
  workforce: Clock,
  pipeline: BarChart3,
  recruitment: Users,
  experience: Heart,
  utilisation: Gauge,
  financial: Wallet,
  // Website
  north_star: Brain,
  funnel: TrendingUp,
  attribution: Share2,
  ai_insights: Sparkles,
  retention: RotateCcw,
  google_signals: Target,
  // Sales
  conversational: MessageSquare,
  meetings: Phone,
  proposals: FileText,
  closing: DollarSign,
  ai_efficiency: Bot,
  quality: Heart,
  forecasting: TrendingUp,
  // Platform
  system: Server,
  edge_functions: Zap,
  security: Shield,
  // Intelligence
  ml_models: Brain,
  churn: AlertTriangle,
  engagement: Activity,
  // Growth
  applications: Briefcase,
  hiring: Users,
  revenue: CreditCard,
  companies: Building2,
  referrals: Share2,
};

const getHealthBadge = (score: number) => {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-amber-500';
  return 'bg-rose-500';
};

export function DomainSidebar({
  domainHealth,
  selectedCategory,
  onSelectCategory,
  onSelectOverview,
}: DomainSidebarProps) {
  const [openDomains, setOpenDomains] = React.useState<Record<KPIDomain, boolean>>({
    operations: true,
    website: true,
    sales: true,
    platform: true,
    intelligence: true,
    growth: true,
  });

  const toggleDomain = (domain: KPIDomain) => {
    setOpenDomains(prev => ({ ...prev, [domain]: !prev[domain] }));
  };

  return (
    <div className="w-64 border-r border-border/50 bg-card/30 flex flex-col">
      <div className="p-4 border-b border-border/50">
        <Button
          variant={selectedCategory === null ? 'secondary' : 'ghost'}
          className="w-full justify-start gap-2"
          onClick={onSelectOverview}
        >
          <LayoutDashboard className="h-4 w-4" />
          Overview
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {domainHealth.map(domain => {
            const DomainIcon = domainIcons[domain.domain];
            const isOpen = openDomains[domain.domain];
            const iconColor = domainColors[domain.domain];

            return (
              <Collapsible
                key={domain.domain}
                open={isOpen}
                onOpenChange={() => toggleDomain(domain.domain)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between px-3 py-2 h-auto"
                  >
                    <div className="flex items-center gap-2">
                      <DomainIcon className={cn("h-4 w-4", iconColor)} />
                      <span className="font-medium">{domain.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {domain.totalKPIs}
                      </span>
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        getHealthBadge(domain.healthScore)
                      )} />
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </Button>
                </CollapsibleTrigger>

                <CollapsibleContent className="pl-4 mt-1 space-y-0.5">
                  {domain.categories.map(category => {
                    const CategoryIcon = categoryIcons[category.name] || BarChart3;
                    const isSelected = selectedCategory === `${domain.domain}:${category.name}`;

                    return (
                      <Button
                        key={category.name}
                        variant={isSelected ? 'secondary' : 'ghost'}
                        size="sm"
                        className="w-full justify-between px-3 py-1.5 h-auto"
                        onClick={() => onSelectCategory(domain.domain, category.name)}
                      >
                        <div className="flex items-center gap-2">
                          <CategoryIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm">{category.displayName}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">
                            {category.kpiCount}
                          </span>
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            getHealthBadge(category.healthScore)
                          )} />
                        </div>
                      </Button>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>

      {/* Legend */}
      <div className="p-4 border-t border-border/50 space-y-2">
        <p className="text-xs text-muted-foreground font-medium">Status</p>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">Good</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-muted-foreground">Warning</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="text-muted-foreground">Critical</span>
          </div>
        </div>
      </div>
    </div>
  );
}
