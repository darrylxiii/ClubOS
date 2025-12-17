import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Download, Loader2, FileSpreadsheet, FileText } from "lucide-react";

const EXPORT_FIELDS = [
  { id: "full_name", label: "Full Name" },
  { id: "email", label: "Email" },
  { id: "phone", label: "Phone" },
  { id: "current_title", label: "Current Title" },
  { id: "location", label: "Location" },
  { id: "current_salary", label: "Current Salary" },
  { id: "desired_salary", label: "Desired Salary" },
  { id: "linkedin_url", label: "LinkedIn URL" },
  { id: "resume_url", label: "Resume URL" },
  { id: "notice_period", label: "Notice Period" },
  { id: "skills", label: "Skills" },
];

export const BulkExportTab = () => {
  const [jobFilter, setJobFilter] = useState<string>("all");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv");
  const [selectedFields, setSelectedFields] = useState<string[]>(["full_name", "email", "current_title"]);

  // Fetch jobs
  const { data: jobs } = useQuery({
    queryKey: ["jobs-for-export"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, title, companies(name)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  // Pipeline stages
  const stages = ["Applied", "Screening", "Interview", "Offer", "Hired", "Rejected"];

  const toggleField = (fieldId: string) => {
    setSelectedFields((prev) =>
      prev.includes(fieldId)
        ? prev.filter((f) => f !== fieldId)
        : [...prev, fieldId]
    );
  };

  // Export mutation
  const exportData = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Build query based on filters
      let candidateIds: string[] = [];

      if (jobFilter !== "all") {
        let appQuery = supabase
          .from("applications")
          .select("candidate_id")
          .eq("job_id", jobFilter);
        
        if (stageFilter !== "all") {
          appQuery = appQuery.eq("status", stageFilter.toLowerCase());
        }

        const { data: apps } = await appQuery;
        candidateIds = apps?.map((a) => a.candidate_id).filter(Boolean) as string[] || [];
      }

      // Fetch candidates
      let query = supabase.from("candidate_profiles").select("*");
      
      if (candidateIds.length > 0) {
        query = query.in("id", candidateIds);
      }

      const { data: candidates, error } = await query.limit(1000);
      if (error) throw error;

      // Log the operation
      await supabase.from("bulk_operation_logs").insert({
        operation_type: "export",
        admin_id: user.id,
        target_count: candidates?.length || 0,
        success_count: candidates?.length || 0,
        status: "completed",
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        metadata: {
          job_filter: jobFilter,
          stage_filter: stageFilter,
          format: exportFormat,
          fields: selectedFields,
        },
      });

      // Format data
      const exportData = candidates?.map((c: any) => {
        const row: Record<string, any> = {};
        selectedFields.forEach((field) => {
          if (field === "current_salary") {
            row[field] = c.current_salary_min ? `${c.current_salary_min}-${c.current_salary_max}` : "";
          } else if (field === "desired_salary") {
            row[field] = c.desired_salary_min ? `${c.desired_salary_min}-${c.desired_salary_max}` : "";
          } else {
            row[field] = c[field] || "";
          }
        });
        return row;
      });

      return { data: exportData, format: exportFormat };
    },
    onSuccess: (result) => {
      if (!result.data || result.data.length === 0) {
        toast.error("No data to export");
        return;
      }

      let content: string;
      let filename: string;
      let mimeType: string;

      if (result.format === "csv") {
        const headers = selectedFields.join(",");
        const rows = result.data.map((row: Record<string, any>) =>
          selectedFields.map((f) => `"${String(row[f] || "").replace(/"/g, '""')}"`).join(",")
        );
        content = [headers, ...rows].join("\n");
        filename = `candidates_export_${new Date().toISOString().split("T")[0]}.csv`;
        mimeType = "text/csv";
      } else {
        content = JSON.stringify(result.data, null, 2);
        filename = `candidates_export_${new Date().toISOString().split("T")[0]}.json`;
        mimeType = "application/json";
      }

      // Download file
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${result.data.length} candidates`);
    },
    onError: (error: Error) => {
      toast.error(`Export failed: ${error.message}`);
    },
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>Filter by Job</Label>
          <Select value={jobFilter} onValueChange={setJobFilter}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="All candidates" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Candidates</SelectItem>
              {jobs?.map((job) => (
                <SelectItem key={job.id} value={job.id}>
                  {job.title} - {(job.companies as any)?.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Filter by Stage</Label>
          <Select value={stageFilter} onValueChange={setStageFilter} disabled={jobFilter === "all"}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="All stages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {stages.map((stage) => (
                <SelectItem key={stage} value={stage}>
                  {stage}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Export Format</Label>
          <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as "csv" | "json")}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  CSV
                </div>
              </SelectItem>
              <SelectItem value="json">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  JSON
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Field Selection */}
      <div>
        <Label className="mb-3 block">Select Fields to Export</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {EXPORT_FIELDS.map((field) => (
            <div
              key={field.id}
              className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedFields.includes(field.id)
                  ? "bg-primary/10 border-primary/30"
                  : "bg-card hover:bg-muted/50"
              }`}
              onClick={() => toggleField(field.id)}
            >
              <Checkbox
                checked={selectedFields.includes(field.id)}
                onCheckedChange={() => toggleField(field.id)}
              />
              <span className="text-sm">{field.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Export Button */}
      <Button
        onClick={() => exportData.mutate()}
        disabled={selectedFields.length === 0 || exportData.isPending}
        className="w-full sm:w-auto"
      >
        {exportData.isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Exporting...
          </>
        ) : (
          <>
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </>
        )}
      </Button>
    </div>
  );
};
