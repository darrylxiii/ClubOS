import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Timer, ArrowRight, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { usePipelineVelocity } from "@/hooks/usePipelineVelocity";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export const PipelineVelocityWidget = () => {
  const { data: velocity, isLoading } = usePipelineVelocity();

  if (isLoading) {
    return (
      <Card className="glass-subtle rounded-2xl h-full">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  const slaCompliance = velocity?.shortlistSLACompliance || 100;
  const slaColor = slaCompliance >= 90 ? 'text-green-500' : slaCompliance >= 70 ? 'text-yellow-500' : 'text-red-500';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full"
    >
      <Card className="glass-subtle rounded-2xl h-full flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-premium" />
              <span>Pipeline Velocity</span>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs">
              <Link to="/applications">
                View All
                <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 space-y-4">
          {/* SLA Compliance */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Shortlist SLA (48h)</span>
              <div className={`flex items-center gap-1 text-xs ${slaColor}`}>
                {slaCompliance >= 90 ? (
                  <CheckCircle className="h-3 w-3" />
                ) : (
                  <AlertTriangle className="h-3 w-3" />
                )}
                <span className="font-medium">{slaCompliance}%</span>
              </div>
            </div>
            <Progress value={slaCompliance} className="h-2" />
          </div>

          {/* Time Metrics */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground">To Shortlist</p>
              <p className="font-semibold text-sm">{velocity?.avgTimeToShortlist || 0}d</p>
            </div>
            <div className="p-2 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground">To Offer</p>
              <p className="font-semibold text-sm">{velocity?.avgTimeToOffer || 0}d</p>
            </div>
            <div className="p-2 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground">To Hire</p>
              <p className="font-semibold text-sm">{velocity?.avgTimeToHire || 0}d</p>
            </div>
          </div>

          {/* Bottleneck Alert */}
          {velocity?.bottleneckStage && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
              <div className="text-xs">
                <span className="text-muted-foreground">Bottleneck: </span>
                <span className="font-medium capitalize">{velocity.bottleneckStage}</span>
              </div>
            </div>
          )}

          {/* Overdue Count */}
          {velocity && velocity.overdueCount > 0 && (
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                Overdue Candidates
              </div>
              <Badge variant="destructive" className="text-xs">
                {velocity.overdueCount}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
