import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { History, FileText, User, CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";

interface EmailDump {
  id: string;
  raw_content: string;
  import_status: string;
  imported_count: number;
  created_at: string;
  processed_at: string | null;
  created_by: string | null;
  extracted_candidates: any[];
}

interface EmailDumpHistoryProps {
  jobId: string;
}

export function EmailDumpHistory({ jobId }: EmailDumpHistoryProps) {
  const [dumps, setDumps] = useState<EmailDump[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDumps();
  }, [jobId]);

  const fetchDumps = async () => {
    const { data, error } = await supabase
      .from("job_email_dumps" as any)
      .select("*")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setDumps(data as any[]);
    }
    setLoading(false);
  };

  const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
    pending: { icon: Clock, color: "text-yellow-500 border-yellow-500/30 bg-yellow-500/10", label: "Pending" },
    imported: { icon: CheckCircle, color: "text-green-500 border-green-500/30 bg-green-500/10", label: "Imported" },
    partial: { icon: CheckCircle, color: "text-blue-500 border-blue-500/30 bg-blue-500/10", label: "Partial" },
    failed: { icon: XCircle, color: "text-red-500 border-red-500/30 bg-red-500/10", label: "Failed" },
  };

  if (loading) {
    return (
      <Card className="border-2 border-border/40 bg-gradient-to-br from-card/90 to-card/60">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Loading history...
        </CardContent>
      </Card>
    );
  }

  if (dumps.length === 0) {
    return (
      <Card className="border-2 border-border/40 bg-gradient-to-br from-card/90 to-card/60">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No email dumps yet for this job.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-border/40 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="font-black uppercase text-sm flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          Dump History ({dumps.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {dumps.map((dump) => {
          const status = statusConfig[dump.import_status] || statusConfig.pending;
          const StatusIcon = status.icon;
          const candidateCount = Array.isArray(dump.extracted_candidates) ? dump.extracted_candidates.length : 0;

          return (
            <div
              key={dump.id}
              className="flex items-center justify-between p-3 rounded-lg bg-background/30 border border-border/20 hover:bg-background/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium">
                    {format(new Date(dump.created_at), "MMM d, yyyy · HH:mm")}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {dump.raw_content.substring(0, 80)}...
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {candidateCount} extracted · {dump.imported_count} imported
                </span>
                <Badge variant="outline" className={`text-[10px] ${status.color}`}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {status.label}
                </Badge>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
