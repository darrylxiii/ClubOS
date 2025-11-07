import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Trash2, Calendar, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { SavedReport } from "@/types/analytics";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SavedReportsListProps {
  companyId: string;
}

export function SavedReportsList({ companyId }: SavedReportsListProps) {
  const { toast } = useToast();

  const { data: reports, isLoading, refetch } = useQuery<SavedReport[]>({
    queryKey: ['saved-reports', companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('saved_reports')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as SavedReport[];
    },
    enabled: !!companyId,
  });

  const handleRunReport = async (reportId: string) => {
    try {
      const { error } = await (supabase as any).rpc('execute_report', {
        p_report_id: reportId,
      });

      if (error) throw error;

      toast({
        title: "Report Executed",
        description: "Your report has been generated successfully",
      });

      refetch();
    } catch (error) {
      console.error('Error running report:', error);
      toast({
        title: "Execution Failed",
        description: "Could not run report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('saved_reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;

      toast({
        title: "Report Deleted",
        description: "The report has been removed",
      });

      refetch();
    } catch (error) {
      console.error('Error deleting report:', error);
      toast({
        title: "Delete Failed",
        description: "Could not delete report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getReportTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'hiring_velocity': 'Hiring Velocity',
      'pipeline': 'Pipeline Health',
      'recruiter': 'Recruiter Performance',
      'custom': 'Custom',
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Saved Reports</CardTitle>
          <CardDescription>Loading your reports...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Saved Reports</CardTitle>
        <CardDescription>
          {reports?.length || 0} report{reports?.length !== 1 ? 's' : ''} saved
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!reports || reports.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No saved reports yet. Create your first report to get started.
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <div
                key={report.id}
                className="border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{report.name}</h4>
                      <Badge variant="secondary">
                        {getReportTypeLabel(report.report_type)}
                      </Badge>
                    </div>
                    {report.description && (
                      <p className="text-sm text-muted-foreground">
                        {report.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {report.is_scheduled && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>Scheduled</span>
                    </div>
                  )}
                  {report.recipients && report.recipients.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      <span>{report.recipients.length} recipient{report.recipients.length !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {report.last_run_at && (
                    <span>
                      Last run: {format(new Date(report.last_run_at), 'MMM d, yyyy')}
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleRunReport(report.id)}
                    className="flex-1"
                  >
                    <Play className="h-3 w-3 mr-1" />
                    Run
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Report</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{report.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteReport(report.id)}
                          className="bg-destructive text-destructive-foreground"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}