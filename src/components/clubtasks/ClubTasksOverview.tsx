import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Hand, Rocket, Zap, MoreHorizontal } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ClubTasksOverviewProps {
  objectiveId: string;
  onRefresh: () => void;
}

interface StatusCount {
  status: string;
  count: number;
}

interface MemberTaskCount {
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  blocked: number;
  to_do: number;
  parking_lot: number;
  on_hold: number;
  total: number;
}

export const ClubTasksOverview = ({ objectiveId, onRefresh }: ClubTasksOverviewProps) => {
  const [statusCounts, setStatusCounts] = useState<StatusCount[]>([]);
  const [memberCounts, setMemberCounts] = useState<MemberTaskCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOverviewData();
  }, [objectiveId]);

  const loadOverviewData = async () => {
    try {
      // Load status counts
      const { data: tasks, error: tasksError } = await supabase
        .from("club_tasks")
        .select("status")
        .eq("objective_id", objectiveId);

      if (tasksError) throw tasksError;

      const statusMap: Record<string, number> = {};
      tasks?.forEach((task) => {
        statusMap[task.status] = (statusMap[task.status] || 0) + 1;
      });

      setStatusCounts(
        Object.entries(statusMap).map(([status, count]) => ({
          status,
          count,
        }))
      );

      // Load member task counts
      const { data: assignees, error: assigneesError } = await supabase
        .from("task_assignees")
        .select(`
          user_id,
          profiles!inner(full_name, avatar_url),
          club_tasks!inner(status, objective_id)
        `)
        .eq("club_tasks.objective_id", objectiveId);

      if (assigneesError) throw assigneesError;

      const memberMap: Record<string, MemberTaskCount> = {};
      
      assignees?.forEach((item: any) => {
        const userId = item.user_id;
        if (!memberMap[userId]) {
          memberMap[userId] = {
            user_id: userId,
            user_name: item.profiles.full_name,
            user_avatar: item.profiles.avatar_url,
            blocked: 0,
            to_do: 0,
            parking_lot: 0,
            on_hold: 0,
            total: 0,
          };
        }

        const status = item.club_tasks.status;
        memberMap[userId].total++;
        
        if (status === "blocked") memberMap[userId].blocked++;
        else if (status === "to_do") memberMap[userId].to_do++;
        else if (status === "parking_lot") memberMap[userId].parking_lot++;
        else if (status === "on_hold") memberMap[userId].on_hold++;
      });

      setMemberCounts(Object.values(memberMap));
    } catch (error) {
      console.error("Error loading overview data:", error);
      toast.error("Failed to load overview");
    } finally {
      setLoading(false);
    }
  };

  const getStatusTotal = (status: string) => {
    return statusCounts.find(s => s.status === status)?.count || 0;
  };

  const chartData = memberCounts.map(member => ({
    name: member.user_name.split(" ")[0],
    "Parking Lot": member.parking_lot,
    "Blocked": member.blocked,
    "To Do": member.to_do,
    "On Hold": member.on_hold,
  }));

  return (
    <div className="space-y-6">
      {/* Status Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-2 border-destructive/50 bg-destructive/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hand className="h-5 w-5 text-destructive" />
                <CardTitle>BLOCKED</CardTitle>
              </div>
              <MoreHorizontal className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-32">
              <div className="relative">
                <svg className="h-32 w-32 transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-destructive/20"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${(getStatusTotal("blocked") / (getStatusTotal("blocked") + getStatusTotal("to_do") + getStatusTotal("in_progress"))) * 352} 352`}
                    className="text-destructive"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold">{getStatusTotal("blocked")}</span>
                  <span className="text-sm text-muted-foreground">Total</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-cyan-500/50 bg-cyan-500/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-cyan-500" />
                <CardTitle>READY FOR ACTION</CardTitle>
              </div>
              <MoreHorizontal className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-32">
              <div className="relative">
                <svg className="h-32 w-32 transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-cyan-500/20"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray="352 352"
                    className="text-cyan-500"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold">{getStatusTotal("to_do")}</span>
                  <span className="text-sm text-muted-foreground">Total</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-amber-500/50 bg-amber-500/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Rocket className="h-5 w-5 text-amber-500" />
                <CardTitle>ONGOING</CardTitle>
              </div>
              <MoreHorizontal className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-32">
              <div className="relative">
                <svg className="h-32 w-32 transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-amber-500/20"
                  />
                  {getStatusTotal("in_progress") === 0 && (
                    <text
                      x="64"
                      y="74"
                      textAnchor="middle"
                      className="text-sm fill-current text-muted-foreground"
                      transform="rotate(90 64 64)"
                    >
                      Geen gegevens
                    </text>
                  )}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold">{getStatusTotal("in_progress")}</span>
                  <span className="text-sm text-muted-foreground">Total</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks by Member Chart */}
      <Card>
        <CardHeader>
          <CardTitle>📊 Tasks by Member</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }} 
                />
                <Legend />
                <Bar dataKey="Parking Lot" stackId="a" fill="hsl(var(--muted))" />
                <Bar dataKey="Blocked" stackId="a" fill="hsl(var(--destructive))" />
                <Bar dataKey="To Do" stackId="a" fill="hsl(var(--destructive) / 0.6)" />
                <Bar dataKey="On Hold" stackId="a" fill="hsl(var(--primary) / 0.6)" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              No task data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
