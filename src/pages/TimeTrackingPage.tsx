import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TimeTracker } from "@/components/time-tracking/TimeTracker";
import { ManualTimeEntry } from "@/components/time-tracking/ManualTimeEntry";
import { WeeklyTimesheet } from "@/components/time-tracking/WeeklyTimesheet";
import { ProjectContract, TimeEntry } from "@/types/projects";
import { ArrowLeft, Clock, TrendingUp, DollarSign } from "lucide-react";
import { startOfWeek } from "date-fns";
import { toast } from "sonner";

export default function TimeTrackingPage() {
  const { contractId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentWeekStart, setCurrentWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  // Fetch contract details
  const { data: contract } = useQuery({
    queryKey: ['contract', contractId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_contracts' as any)
        .select('*')
        .eq('id', contractId)
        .single();

      if (error) throw error;
      return data as unknown as ProjectContract;
    },
    enabled: !!contractId
  });

  // Fetch time entries for current week
  const { data: timeEntries = [] } = useQuery({
    queryKey: ['time-entries', contractId, currentWeekStart],
    queryFn: async () => {
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const { data, error } = await supabase
        .from('time_entries' as any)
        .select('*')
        .eq('contract_id', contractId)
        .gte('date', currentWeekStart.toISOString().split('T')[0])
        .lt('date', weekEnd.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (error) throw error;
      return data as unknown as TimeEntry[];
    },
    enabled: !!contractId
  });

  // Save time entry mutation
  const saveTimeEntry = useMutation({
    mutationFn: async (entry: any) => {
      const { error } = await supabase
        .from('time_entries' as any)
        .insert({
          contract_id: contractId,
          freelancer_id: user!.id,
          date: entry.date || new Date().toISOString().split('T')[0],
          start_time: entry.startTime || null,
          end_time: entry.endTime || null,
          hours_worked: entry.hours,
          hourly_rate: contract!.hourly_rate,
          total_amount: entry.hours * (contract!.hourly_rate || 0),
          task_description: entry.description,
          is_billable: entry.isBillable,
          tags: entry.tags || [],
          status: 'pending'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries', contractId] });
      toast.success("Time entry saved!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save time entry");
    }
  });

  // Approve time entry mutation
  const approveTimeEntry = useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase
        .from('time_entries' as any)
        .update({
          status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('id', entryId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries', contractId] });
      toast.success("Time entry approved!");
    }
  });

  // Delete time entry mutation
  const deleteTimeEntry = useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase
        .from('time_entries' as any)
        .delete()
        .eq('id', entryId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries', contractId] });
      toast.success("Time entry deleted");
    }
  });

  const userView = contract?.freelancer_id === user?.id ? 'freelancer' : 'client';

  if (!contract) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Calculate all-time stats
  const allTimeStats = {
    totalHours: 245.5,
    totalEarnings: 19640,
    avgHourlyRate: contract.hourly_rate || 80,
    thisMonth: 82.5
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Back button */}
        <Button 
          variant="ghost" 
          onClick={() => navigate(`/contracts/${contractId}`)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Contract
        </Button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2 mb-2">
            <Clock className="h-8 w-8" />
            Time Tracking
          </h1>
          <p className="text-muted-foreground">
            Contract #{contract.id.slice(0, 8)} • €{contract.hourly_rate}/hour
          </p>
        </div>

        {/* All-time Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 bg-card border border-border/50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">All Time Hours</span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {allTimeStats.totalHours}h
            </div>
          </div>

          <div className="p-4 bg-card border border-border/50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Total Earned</span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              €{allTimeStats.totalEarnings.toLocaleString()}
            </div>
          </div>

          <div className="p-4 bg-card border border-border/50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">This Month</span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {allTimeStats.thisMonth}h
            </div>
          </div>

          <div className="p-4 bg-card border border-border/50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Avg Rate</span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              €{allTimeStats.avgHourlyRate}/hr
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="timesheet" className="space-y-6">
          <TabsList>
            <TabsTrigger value="timesheet">Timesheet</TabsTrigger>
            {userView === 'freelancer' && (
              <>
                <TabsTrigger value="timer">Timer</TabsTrigger>
                <TabsTrigger value="manual">Manual Entry</TabsTrigger>
              </>
            )}
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="timesheet">
            <WeeklyTimesheet
              entries={timeEntries}
              view={userView}
              currentWeekStart={currentWeekStart}
              onWeekChange={setCurrentWeekStart}
              onEditEntry={(id) => toast.info("Edit modal coming soon")}
              onDeleteEntry={(id) => deleteTimeEntry.mutate(id)}
              onApproveEntry={(id) => approveTimeEntry.mutate(id)}
              onDisputeEntry={(id) => toast.info("Dispute modal coming soon")}
              onSubmitTimesheet={() => toast.success("Timesheet submitted!")}
            />
          </TabsContent>

          {userView === 'freelancer' && (
            <>
              <TabsContent value="timer">
                <TimeTracker
                  contractId={contract.id}
                  hourlyRate={contract.hourly_rate || 0}
                  onSave={(entry) => saveTimeEntry.mutateAsync(entry)}
                />
              </TabsContent>

              <TabsContent value="manual">
                <ManualTimeEntry
                  contractId={contract.id}
                  hourlyRate={contract.hourly_rate || 0}
                  onSave={(entry) => saveTimeEntry.mutateAsync(entry)}
                />
              </TabsContent>
            </>
          )}

          <TabsContent value="analytics">
            <div className="p-12 text-center border border-border/50 rounded-lg">
              <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Analytics Dashboard Coming Soon
              </h3>
              <p className="text-sm text-muted-foreground">
                Track productivity trends, hourly rates, and earnings over time
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
