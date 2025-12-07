import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { useRole } from "@/contexts/RoleContext";
import { MyTimeEntries } from "./MyTimeEntries";
import { TeamTimeOverview } from "./TeamTimeOverview";
import { PendingApprovals } from "./PendingApprovals";
import { QuickTimeStats } from "./QuickTimeStats";
import { Clock, Users, CheckCircle } from "lucide-react";

export function TimeTrackingDashboard() {
  const { currentRole } = useRole();
  const { myStats, teamStats, pendingApprovals, isLoading } = useTimeTracking();
  const [activeTab, setActiveTab] = useState("my-time");

  const isManager = ['admin', 'strategist', 'partner'].includes(currentRole || '');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <QuickTimeStats 
        stats={myStats} 
        showTeamStats={isManager}
        teamStats={teamStats}
      />

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="my-time" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            My Time
          </TabsTrigger>
          {isManager && (
            <>
              <TabsTrigger value="team" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Team Overview
              </TabsTrigger>
              <TabsTrigger value="approvals" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Approvals
                {pendingApprovals.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                    {pendingApprovals.length}
                  </span>
                )}
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="my-time" className="mt-6">
          <MyTimeEntries />
        </TabsContent>

        {isManager && (
          <>
            <TabsContent value="team" className="mt-6">
              <TeamTimeOverview />
            </TabsContent>

            <TabsContent value="approvals" className="mt-6">
              <PendingApprovals />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
