import { TimeTrackingDashboard } from "@/components/time-tracking/TimeTrackingDashboard";
import { Clock } from "lucide-react";

export default function TimeTrackingPage() {
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Clock className="h-8 w-8" />
          Time Tracking
        </h1>
        <p className="text-muted-foreground mt-1">
          Track, manage, and approve work hours across your team
        </p>
      </div>

      {/* Main Dashboard */}
      <TimeTrackingDashboard />
    </div>
  );
}
