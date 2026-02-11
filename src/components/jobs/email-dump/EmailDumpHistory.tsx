import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { History, CheckCircle, XCircle, Clock, RotateCw, Loader2 } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import { getInitials } from "@/lib/strings";

interface CreatorProfile {
  full_name: string;
  avatar_url: string | null;
}

interface EmailDump {
  id: string;
  raw_content: string;
  import_status: string;
  imported_count: number;
  created_at: string;
  processed_at: string | null;
  created_by: string | null;
  extracted_candidates: any[];
  job_id: string;
  _creator?: CreatorProfile;
}

interface EmailDumpHistoryProps {
  jobId: string;
}

export function EmailDumpHistory({ jobId }: EmailDumpHistoryProps) {
  const [dumps, setDumps] = useState<EmailDump[]>([]);
  const [loading, setLoading] = useState(true);
  const [reprocessingId, setReprocessingId] = useState<string | null>(null);

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
      // Resolve creator profiles
      const userIds = [...new Set((data as any[]).map((d: any) => d.created_by).filter(Boolean))];
      const profileMap = new Map<string, CreatorProfile>();

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", userIds);

        (profiles || []).forEach((p: any) =>
          profileMap.set(p.id, { full_name: p.full_name, avatar_url: p.avatar_url })
        );
      }

      setDumps(
        (data as any[]).map((d: any) => ({
          ...d,
          _creator: profileMap.get(d.created_by) || undefined,
        }))
      );
    }
    setLoading(false);
  };

  const handleReprocess = async (dump: EmailDump) => {
    setReprocessingId(dump.id);
    try {
      const { data, error } = await supabase.functions.invoke("parse-email-candidates", {
        body: { raw_content: dump.raw_content, job_id: dump.job_id, dump_id: dump.id },
      });

      if (error) throw error;

      toast.success(`Re-processed: ${data?.count || 0} candidates extracted`);
      await fetchDumps();
    } catch (error: any) {
      console.error("Reprocess error:", error);
      toast.error(error.message || "Failed to re-process dump");
    } finally {
      setReprocessingId(null);
    }
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
          const isReprocessing = reprocessingId === dump.id;
          const canReprocess = dump.import_status === "failed" || dump.import_status === "pending";
          const creatorName = dump._creator?.full_name || "Unknown";
          const creatorInitials = getInitials(creatorName);
          const relativeTime = formatDistanceToNow(new Date(dump.created_at), { addSuffix: true });
          const fullDate = format(new Date(dump.created_at), "MMM d, yyyy · HH:mm");

          return (
            <div
              key={dump.id}
              className="flex items-center justify-between p-3 rounded-lg bg-background/30 border border-border/20 hover:bg-background/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  {dump._creator?.avatar_url && (
                    <AvatarImage src={dump._creator.avatar_url} alt={creatorName} />
                  )}
                  <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                    {creatorInitials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs font-medium">
                    {creatorName}
                    <span className="text-muted-foreground font-normal ml-2" title={fullDate}>
                      {relativeTime}
                    </span>
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
                {canReprocess && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReprocess(dump)}
                    disabled={isReprocessing}
                    className="h-7 px-2 gap-1 text-xs"
                  >
                    {isReprocessing ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RotateCw className="h-3 w-3" />
                    )}
                    Re-process
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
