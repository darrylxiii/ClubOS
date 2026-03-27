import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TaskCSVExportProps {
  objectiveId?: string | null;
}

export function TaskCSVExport({ objectiveId }: TaskCSVExportProps) {
  const { t } = useTranslation('common');
  const handleExport = async () => {
    try {
      let query = supabase
        .from("unified_tasks")
        .select(`
          task_number,
          title,
          description,
          status,
          priority,
          due_date,
          scheduled_start,
          scheduling_mode,
          created_at,
          completed_at,
          estimated_duration_minutes,
          time_tracked_minutes,
          is_overdue,
          task_type
        `)
        .order("created_at", { ascending: false });

      if (objectiveId) {
        query = query.eq("objective_id", objectiveId);
      }

      const { data, error } = await query;
      if (error) throw error;
      if (!data || data.length === 0) {
        toast.error(t("no_tasks_to_export", "No tasks to export"));
        return;
      }

      const headers = [
        "Task #",
        "Title",
        "Description",
        "Status",
        "Priority",
        "Due Date",
        "Scheduled Start",
        "Scheduling Mode",
        "Created At",
        "Completed At",
        "Estimated (min)",
        "Tracked (min)",
        "Overdue",
        "Type",
      ];

      const escape = (val: any) => {
        if (val == null) return "";
        const str = String(val).replace(/"/g, '""');
        return str.includes(",") || str.includes('"') || str.includes("\n")
          ? `"${str}"`
          : str;
      };

      const rows = data.map((t) => [
        escape(t.task_number),
        escape(t.title),
        escape(t.description),
        escape(t.status),
        escape(t.priority),
        escape(t.due_date),
        escape(t.scheduled_start),
        escape(t.scheduling_mode),
        escape(t.created_at),
        escape(t.completed_at),
        escape(t.estimated_duration_minutes),
        escape(t.time_tracked_minutes),
        escape(t.is_overdue),
        escape(t.task_type),
      ]);

      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `tasks_${format(new Date(), "yyyy-MM-dd")}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success(`Exported ${data.length} tasks`);
    } catch (error) {
      console.error("CSV export error:", error);
      toast.error(t("export_failed", "Export failed"));
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleExport}
          >
            <Download className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t("export_csv", "Export CSV")}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
