import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Compass, 
  DollarSign, 
  Users, 
  TrendingUp,
  AlertCircle,
  Sparkles,
  ArrowUpRight,
  Target,
  Zap
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PortfolioHealth {
  clientId: string;
  clientName: string;
  healthScore: number;
  activeRoles: number;
  lastEngagement: string;
  risk?: string;
}

interface CrossSellOpportunity {
  clientId: string;
  clientName: string;
  opportunity: string;
  potentialValue: number;
  confidence: number;
}

interface RevenueInsight {
  projected: number;
  realized: number;
  pipeline: number;
  atRisk: number;
}

export function StrategistAgentWidget() {
  const { data: portfolioHealth } = useQuery({
    queryKey: ["strategist-portfolio-health"],
    queryFn: async (): Promise<PortfolioHealth[]> => {
      return [
        {
          clientId: "1",
          clientName: "TechCorp Inc",
          healthScore: 92,
          activeRoles: 5,
          lastEngagement: "2 hours ago",
        },
        {
          clientId: "2",
          clientName: "StartupXYZ",
          healthScore: 65,
          activeRoles: 2,
          lastEngagement: "5 days ago",
          risk: "Low engagement",
        },
        {
          clientId: "3",
          clientName: "Enterprise Co",
          healthScore: 88,
          activeRoles: 8,
          lastEngagement: "Yesterday",
        },
      ];
    },
  });

  const { data: crossSellOpportunities } = useQuery({
    queryKey: ["strategist-cross-sell"],
    queryFn: async (): Promise<CrossSellOpportunity[]> => {
      return [
        {
          clientId: "1",
          clientName: "TechCorp Inc",
          opportunity: "Executive search for new VP Engineering",
          potentialValue: 45000,
          confidence: 78,
        },
        {
          clientId: "3",
          clientName: "Enterprise Co",
          opportunity: "Expand to APAC hiring",
          potentialValue: 120000,
          confidence: 65,
        },
      ];
    },
  });

  const { data: revenueInsight } = useQuery({
    queryKey: ["strategist-revenue-insight"],
    queryFn: async (): Promise<RevenueInsight> => {
      return {
        projected: 285000,
        realized: 142000,
        pipeline: 520000,
        atRisk: 35000,
      };
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-destructive";
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Compass className="h-5 w-5 text-primary" />
          Strategist Command Center
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Revenue Overview */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 rounded-lg bg-muted/30 text-center">
            <DollarSign className="h-4 w-4 mx-auto mb-1 text-green-500" />
            <p className="text-lg font-bold">{formatCurrency(revenueInsight?.realized || 0)}</p>
            <p className="text-xs text-muted-foreground">Realized</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 text-center">
            <TrendingUp className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold">{formatCurrency(revenueInsight?.projected || 0)}</p>
            <p className="text-xs text-muted-foreground">Projected</p>
          </div>
        </div>

        {/* At Risk Alert */}
        {revenueInsight && revenueInsight.atRisk > 0 && (
          <div className="p-2 rounded-lg border border-yellow-500/50 bg-yellow-500/10">
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <span className="font-medium">{formatCurrency(revenueInsight.atRisk)} at risk</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              2 deals showing withdrawal signals. QUIN recommends immediate engagement.
            </p>
          </div>
        )}

        {/* Portfolio Health */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-1">
            <Users className="h-4 w-4" />
            Client Health
          </h4>
          {portfolioHealth?.slice(0, 3).map((client) => (
            <div
              key={client.clientId}
              className="flex items-center justify-between p-2 rounded-lg bg-muted/20"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{client.clientName}</p>
                  {client.risk && (
                    <Badge variant="outline" className="text-xs text-yellow-500 border-yellow-500/50">
                      {client.risk}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {client.activeRoles} roles • {client.lastEngagement}
                </p>
              </div>
              <div className={`text-lg font-bold ${getHealthColor(client.healthScore)}`}>
                {client.healthScore}
              </div>
            </div>
          ))}
        </div>

        {/* Cross-Sell Opportunities */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-1">
            <Zap className="h-4 w-4" />
            Opportunities Detected
          </h4>
          {crossSellOpportunities?.slice(0, 2).map((opp, index) => (
            <div
              key={index}
              className="p-2 rounded-lg border border-primary/30 bg-primary/5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{opp.clientName}</p>
                  <p className="text-xs text-muted-foreground">{opp.opportunity}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-green-500">{formatCurrency(opp.potentialValue)}</p>
                  <p className="text-xs text-muted-foreground">{opp.confidence}% conf.</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Button className="w-full" variant="outline" size="sm">
          <Target className="h-4 w-4 mr-2" />
          Full Portfolio View
        </Button>
      </CardContent>
    </Card>
  );
}
