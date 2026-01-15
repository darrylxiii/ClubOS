import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DollarSign, TrendingUp, Clock, Award } from "lucide-react";
import { motion } from "framer-motion";
import { EmployeeProfile, EmployeeMetrics, EmployeeTarget } from "@/hooks/useEmployeeProfile";
import { formatCurrency } from "@/lib/revenueCalculations";

interface EmployeeOverviewCardProps {
  employee: EmployeeProfile;
  metrics: EmployeeMetrics | null;
  currentTarget: EmployeeTarget | null;
  hoursThisMonth?: number;
}

export function EmployeeOverviewCard({ 
  employee, 
  metrics, 
  currentTarget,
  hoursThisMonth = 0 
}: EmployeeOverviewCardProps) {
  const targetProgress = currentTarget && currentTarget.revenue_target
    ? (currentTarget.revenue_achieved / currentTarget.revenue_target) * 100
    : 0;

  const placementProgress = currentTarget && currentTarget.placements_target
    ? (currentTarget.placements_achieved / currentTarget.placements_target) * 100
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Performance Overview</CardTitle>
              <p className="text-sm text-muted-foreground">
                {employee.job_title} • {employee.department || 'TQC Staff'}
              </p>
            </div>
            <Badge variant={employee.is_active ? "default" : "secondary"}>
              {employee.employment_type.replace('_', ' ')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricItem
              icon={DollarSign}
              label="Total Earned"
              value={formatCurrency(metrics?.total_commissions || 0)}
              color="text-green-500"
            />
            <MetricItem
              icon={TrendingUp}
              label="Pending"
              value={formatCurrency(metrics?.pending_commissions || 0)}
              color="text-amber-500"
            />
            <MetricItem
              icon={Award}
              label="Placements"
              value={metrics?.placement_count?.toString() || '0'}
              color="text-blue-500"
            />
            <MetricItem
              icon={Clock}
              label="Hours (Month)"
              value={`${hoursThisMonth}h`}
              color="text-purple-500"
            />
          </div>

          {/* Target Progress */}
          {currentTarget && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">
                {currentTarget.period_type.charAt(0).toUpperCase() + currentTarget.period_type.slice(1)} Targets
              </h4>
              
              <div className="space-y-3">
                <ProgressItem
                  label="Revenue Target"
                  current={currentTarget.revenue_achieved}
                  target={currentTarget.revenue_target || 0}
                  progress={targetProgress}
                  format="currency"
                />
                <ProgressItem
                  label="Placements"
                  current={currentTarget.placements_achieved}
                  target={currentTarget.placements_target || 0}
                  progress={placementProgress}
                />
              </div>
            </div>
          )}

          {/* Commission Rate */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span className="text-sm text-muted-foreground">Commission Rate</span>
            <span className="font-semibold">{employee.commission_percentage}%</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function MetricItem({ 
  icon: Icon, 
  label, 
  value, 
  color 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string; 
  color: string;
}) {
  return (
    <div className="p-3 bg-muted/30 rounded-lg">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

function ProgressItem({
  label,
  current,
  target,
  progress,
  format = "number"
}: {
  label: string;
  current: number;
  target: number;
  progress: number;
  format?: "number" | "currency";
}) {
  const displayCurrent = format === "currency" ? formatCurrency(current) : current;
  const displayTarget = format === "currency" ? formatCurrency(target) : target;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {displayCurrent} / {displayTarget}
        </span>
      </div>
      <Progress 
        value={Math.min(progress, 100)} 
        className="h-2"
      />
    </div>
  );
}
