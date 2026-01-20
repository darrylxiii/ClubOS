import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Play, Save, Trash2 } from "lucide-react";
import { notify } from "@/lib/notify";
import { supabase } from "@/integrations/supabase/client";
import { SavedReportsList } from "./SavedReportsList";

interface ReportBuilderProps {
  companyId: string;
}

export function ReportBuilder({ companyId }: ReportBuilderProps) {
  const [reportName, setReportName] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [reportType, setReportType] = useState<string>("hiring_velocity");
  const [visualizationType, setVisualizationType] = useState<string>("table");
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleCron, setScheduleCron] = useState("0 9 * * MON");
  const [recipients, setRecipients] = useState("");
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);

  const handleSaveReport = async () => {
    if (!reportName.trim()) {
      notify.error("Validation Error", {
        description: "Please enter a report name",
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('saved_reports' as any)
        .insert({
          company_id: companyId,
          name: reportName,
          description: reportDescription,
          report_type: reportType,
          query_config: {
            filters: {},
            dimensions: [],
            metrics: [],
          },
          visualization_type: visualizationType,
          is_scheduled: isScheduled,
          schedule_cron: isScheduled ? scheduleCron : null,
          recipients: isScheduled && recipients ? recipients.split(',').map(r => r.trim()) : [],
          created_by: user?.id,
        });

      if (error) throw error;

      notify.success("Report Saved", {
        description: "Your report has been saved successfully",
      });

      // Reset form
      setReportName("");
      setReportDescription("");
      setReportType("hiring_velocity");
      setVisualizationType("table");
      setIsScheduled(false);
      setRecipients("");
    } catch (error) {
      console.error('Error saving report:', error);
      notify.error("Save Failed", {
        description: "Could not save report. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRunReport = async () => {
    setRunning(true);
    try {
      notify.loading("Running Report", {
        description: "Your report is being generated...",
      });

      // Simulate report execution
      await new Promise(resolve => setTimeout(resolve, 2000));

      notify.dismiss();
      notify.success("Report Complete", {
        description: "Your report is ready to view",
      });
    } catch (error) {
      notify.dismiss();
      notify.error("Execution Failed", {
        description: "Could not run report. Please try again.",
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Custom Report Builder</h2>
        <p className="text-muted-foreground">
          Create, schedule, and manage custom analytics reports
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Report Builder Form */}
        <Card>
          <CardHeader>
            <CardTitle>New Report</CardTitle>
            <CardDescription>
              Configure your report settings and save for future use
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="report-name">Report Name</Label>
              <Input
                id="report-name"
                placeholder="e.g., Weekly Hiring Summary"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-description">Description</Label>
              <Textarea
                id="report-description"
                placeholder="Brief description of this report..."
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-type">Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger id="report-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hiring_velocity">Hiring Velocity</SelectItem>
                  <SelectItem value="pipeline">Pipeline Health</SelectItem>
                  <SelectItem value="recruiter">Recruiter Performance</SelectItem>
                  <SelectItem value="custom">Custom Query</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="visualization">Visualization</Label>
              <Select value={visualizationType} onValueChange={setVisualizationType}>
                <SelectTrigger id="visualization">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="table">Table</SelectItem>
                  <SelectItem value="line">Line Chart</SelectItem>
                  <SelectItem value="bar">Bar Chart</SelectItem>
                  <SelectItem value="pie">Pie Chart</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="scheduled">Schedule Report</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically run and email this report
                </p>
              </div>
              <Switch
                id="scheduled"
                checked={isScheduled}
                onCheckedChange={setIsScheduled}
              />
            </div>

            {isScheduled && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="schedule-cron">Schedule (Cron Expression)</Label>
                  <Input
                    id="schedule-cron"
                    placeholder="0 9 * * MON"
                    value={scheduleCron}
                    onChange={(e) => setScheduleCron(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Example: "0 9 * * MON" = Every Monday at 9 AM
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recipients">Email Recipients</Label>
                  <Input
                    id="recipients"
                    placeholder="email1@company.com, email2@company.com"
                    value={recipients}
                    onChange={(e) => setRecipients(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Comma-separated email addresses
                  </p>
                </div>
              </>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleRunReport}
                disabled={running || !reportName}
                className="flex-1"
              >
                <Play className="h-4 w-4 mr-2" />
                Run Now
              </Button>
              <Button
                onClick={handleSaveReport}
                disabled={saving || !reportName}
                variant="outline"
                className="flex-1"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Report
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Saved Reports List */}
        <SavedReportsList companyId={companyId} />
      </div>
    </div>
  );
}