import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Eye, Bell, TrendingUp, Users } from "lucide-react";
import { ProbationTracker } from "@/components/probation/ProbationTracker";

interface ObserverDashboardProps {
  jobId: string;
}

export function ObserverDashboard({ jobId }: ObserverDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Read-only pipeline view */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Pipeline Overview
          </CardTitle>
          <CardDescription>Read-only view for stakeholders</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You have observer access to this role. View pipeline in the Pipeline tab above.
          </p>
        </CardContent>
      </Card>

      {/* Weekly summaries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Weekly Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">You'll receive a digest every Monday with key updates</p>
        </CardContent>
      </Card>

      {/* Probation Monitoring - Read Only */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Placement Tracking
          </CardTitle>
          <CardDescription>Monitor probation periods and guarantees</CardDescription>
        </CardHeader>
        <CardContent>
          <ProbationTracker />
        </CardContent>
      </Card>
    </div>
  );
}
