import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, ArrowRight, AlertTriangle, CheckCircle, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { usePartnerEngagement } from "@/hooks/usePartnerEngagement";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export const PartnerEngagementWidget = () => {
  const { data: engagement, isLoading } = usePartnerEngagement();

  if (isLoading) {
    return (
      <Card className="glass-card h-full">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  const activePercentage = engagement?.totalPartners 
    ? Math.round((engagement.activePartners / engagement.totalPartners) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full"
    >
      <Card className="glass-card h-full flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-premium" />
              <span>Partner Engagement</span>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs">
              <Link to="/admin?tab=companies">
                View All
                <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 space-y-4">
          {/* Partner Counts */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-xl font-bold">{engagement?.totalPartners || 0}</p>
            </div>
            <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-xs text-muted-foreground">Active</p>
              <p className="text-xl font-bold text-green-500">{engagement?.activePartners || 0}</p>
            </div>
            <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-xs text-muted-foreground">At Risk</p>
              <p className="text-xl font-bold text-red-500">{engagement?.atRiskPartners || 0}</p>
            </div>
          </div>

          {/* Active Engagement Rate */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Active Rate (7 days)</span>
              <span className="text-xs font-medium">{activePercentage}%</span>
            </div>
            <Progress value={activePercentage} className="h-1.5" />
          </div>

          {/* Success Rate */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-xs">Placement Success Rate</span>
            </div>
            <span className="font-semibold">{engagement?.placementSuccessRate || 0}%</span>
          </div>

          {/* At Risk Alert */}
          {engagement && engagement.atRiskPartners > 0 && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
              <div className="text-xs">
                <span className="font-medium">{engagement.atRiskPartners} partners</span>
                <span className="text-muted-foreground"> inactive 14+ days</span>
              </div>
            </div>
          )}

          {/* Top Partners Preview */}
          {engagement?.topPartners && engagement.topPartners.length > 0 && (
            <div className="pt-2 border-t border-border/50">
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Users className="h-3 w-3" />
                Top Performers
              </p>
              <div className="space-y-1">
                {engagement.topPartners.slice(0, 2).map((partner) => (
                  <div key={partner.id} className="flex items-center justify-between text-xs">
                    <span className="truncate">{partner.companyName}</span>
                    <Badge variant="secondary" className="text-xs">
                      {partner.placements} hires
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
