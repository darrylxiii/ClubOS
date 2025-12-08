import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle,
  ChevronRight,
  Award
} from "lucide-react";
import { motion } from "framer-motion";
import { EmployeeProfile } from "@/hooks/useEmployeeProfile";
import { formatCurrency } from "@/lib/revenueCalculations";
import { useNavigate } from "react-router-dom";

interface TeamOverviewDashboardProps {
  directReports: EmployeeProfile[];
  teamMetrics?: Record<string, {
    revenue: number;
    placements: number;
    targetProgress: number;
    hoursThisMonth: number;
  }>;
  isLoading?: boolean;
}

export function TeamOverviewDashboard({ 
  directReports, 
  teamMetrics = {},
  isLoading 
}: TeamOverviewDashboardProps) {
  const navigate = useNavigate();

  const totalRevenue = Object.values(teamMetrics).reduce((sum, m) => sum + m.revenue, 0);
  const totalPlacements = Object.values(teamMetrics).reduce((sum, m) => sum + m.placements, 0);
  const avgProgress = directReports.length > 0
    ? Object.values(teamMetrics).reduce((sum, m) => sum + m.targetProgress, 0) / directReports.length
    : 0;

  const behindTarget = directReports.filter(emp => 
    (teamMetrics[emp.id]?.targetProgress || 0) < 50
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted/50 animate-pulse rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Team Overview
          <Badge variant="secondary" className="ml-2">
            {directReports.length} direct reports
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Team Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-muted/30 rounded-lg text-center">
            <DollarSign className="h-5 w-5 text-green-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
            <p className="text-xs text-muted-foreground">Team Revenue YTD</p>
          </div>
          <div className="p-4 bg-muted/30 rounded-lg text-center">
            <Award className="h-5 w-5 text-blue-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{totalPlacements}</p>
            <p className="text-xs text-muted-foreground">Total Placements</p>
          </div>
          <div className="p-4 bg-muted/30 rounded-lg text-center">
            <TrendingUp className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold">{Math.round(avgProgress)}%</p>
            <p className="text-xs text-muted-foreground">Avg Target Progress</p>
          </div>
        </div>

        {/* Alerts */}
        {behindTarget.length > 0 && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <div>
              <p className="text-sm font-medium">Attention Required</p>
              <p className="text-xs text-muted-foreground">
                {behindTarget.length} team member{behindTarget.length > 1 ? 's' : ''} behind target
              </p>
            </div>
          </div>
        )}

        {/* Team Members List */}
        <div className="space-y-3">
          {directReports.map((employee, index) => (
            <TeamMemberCard
              key={employee.id}
              employee={employee}
              metrics={teamMetrics[employee.id]}
              index={index}
              onClick={() => navigate(`/admin/employees/${employee.id}`)}
            />
          ))}
        </div>

        {directReports.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <Users className="h-8 w-8 mb-2 opacity-50" />
            <p>No direct reports</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TeamMemberCard({ 
  employee, 
  metrics,
  index,
  onClick 
}: { 
  employee: EmployeeProfile;
  metrics?: {
    revenue: number;
    placements: number;
    targetProgress: number;
    hoursThisMonth: number;
  };
  index: number;
  onClick: () => void;
}) {
  const progress = metrics?.targetProgress || 0;
  const isBehind = progress < 50;
  const profileData = employee.profile as { full_name?: string; avatar_url?: string | null } | undefined;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Button
        variant="ghost"
        className="w-full justify-between p-4 h-auto hover:bg-muted/50"
        onClick={onClick}
      >
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={profileData?.avatar_url || undefined} />
            <AvatarFallback>
              {profileData?.full_name?.charAt(0) || 'E'}
            </AvatarFallback>
          </Avatar>
          <div className="text-left">
            <p className="font-medium">
              {profileData?.full_name || 'Employee'}
            </p>
            <p className="text-xs text-muted-foreground">
              {employee.job_title}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {metrics && (
            <>
              <div className="text-right hidden md:block">
                <p className="text-sm font-medium">{formatCurrency(metrics.revenue)}</p>
                <p className="text-xs text-muted-foreground">{metrics.placements} placements</p>
              </div>
              <div className="w-24">
                <Progress 
                  value={progress} 
                  className={`h-2 ${isBehind ? '[&>div]:bg-amber-500' : ''}`}
                />
                <p className="text-xs text-muted-foreground text-right mt-1">
                  {Math.round(progress)}%
                </p>
              </div>
            </>
          )}
          {isBehind && (
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          )}
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </Button>
    </motion.div>
  );
}
