import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UpcomingInterviewsWidget } from "@/components/partner/UpcomingInterviewsWidget";
import { Calendar, BarChart3, Target } from "lucide-react";

interface InterviewerDashboardProps {
  jobId: string;
}

export function InterviewerDashboard({ jobId }: InterviewerDashboardProps) {
  return (
    <div className="space-y-6">
      {/* My Interviews Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            My Interview Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UpcomingInterviewsWidget jobId={jobId} />
        </CardContent>
      </Card>

      {/* My Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            My Interview Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Interviews Conducted</p>
              <p className="text-2xl font-bold">-</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Feedback Time</p>
              <p className="text-2xl font-bold">-h</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Hire Rate</p>
              <p className="text-2xl font-bold">-%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
