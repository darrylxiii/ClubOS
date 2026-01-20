import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Bot,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Send,
  Calendar,
  MessageSquare,
  FileText
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface PendingAction {
  id: string;
  agentName: string;
  actionType: string;
  description: string;
  reasoning: string;
  affectedEntity: {
    type: string;
    name: string;
    id: string;
  };
  confidenceScore: number;
  createdAt: string;
  expiresAt?: string;
  data: Record<string, any>;
}

export function AgentApprovalQueue() {
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [expandedAction, setExpandedAction] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const queryClient = useQueryClient();

  const { data: pendingActions, isLoading } = useQuery({
    queryKey: ["agent-pending-actions"],
    queryFn: async (): Promise<PendingAction[]> => {
      // In production, this would fetch from agent_decision_log where status = 'pending_approval'
      const { data } = await supabase
        .from("agent_decision_log")
        .select("*")
        .eq("human_can_override", true)
        .eq("was_overridden", false)
        .order("created_at", { ascending: false })
        .limit(20);

      return (data || []).map((d: any) => ({
        id: d.id,
        agentName: d.agent_name,
        actionType: d.decision_type,
        description: d.decision_made,
        reasoning: typeof d.reasoning === 'object' ? JSON.stringify(d.reasoning) : d.reasoning || "No reasoning provided",
        affectedEntity: d.affected_entities?.[0] || { type: "unknown", name: "Unknown", id: "" },
        confidenceScore: d.confidence_score || 0.75,
        createdAt: d.created_at,
        data: d.context_used || {},
      }));
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (actionIds: string[]) => {
      const { error } = await supabase
        .from("agent_decision_log")
        .update({ was_overridden: false })
        .in("id", actionIds);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Actions approved");
      queryClient.invalidateQueries({ queryKey: ["agent-pending-actions"] });
      setSelectedActions([]);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ actionIds, reason }: { actionIds: string[]; reason: string }) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("agent_decision_log")
        .update({ 
          was_overridden: true,
          override_reason: reason,
          overridden_by: user.user?.id,
        })
        .in("id", actionIds);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Actions rejected with feedback");
      queryClient.invalidateQueries({ queryKey: ["agent-pending-actions"] });
      setSelectedActions([]);
      setFeedbackText("");
    },
  });

  const getActionIcon = (type: string) => {
    switch (type) {
      case "send_message":
      case "follow_up":
        return <MessageSquare className="h-4 w-4" />;
      case "schedule_interview":
      case "schedule_meeting":
        return <Calendar className="h-4 w-4" />;
      case "create_document":
      case "generate_report":
        return <FileText className="h-4 w-4" />;
      default:
        return <Bot className="h-4 w-4" />;
    }
  };

  const toggleAction = (id: string) => {
    setSelectedActions(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedActions.length === pendingActions?.length) {
      setSelectedActions([]);
    } else {
      setSelectedActions(pendingActions?.map(a => a.id) || []);
    }
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-primary" />
            Pending Agent Actions
            {pendingActions && pendingActions.length > 0 && (
              <Badge variant="secondary">{pendingActions.length}</Badge>
            )}
          </CardTitle>
          {pendingActions && pendingActions.length > 0 && (
            <Button variant="ghost" size="sm" onClick={selectAll}>
              {selectedActions.length === pendingActions.length ? "Deselect All" : "Select All"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading pending actions...
          </div>
        ) : !pendingActions || pendingActions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p>No pending actions requiring approval</p>
          </div>
        ) : (
          <>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {pendingActions.map((action) => (
                  <div
                    key={action.id}
                    className={`p-3 rounded-lg border transition-colors ${
                      selectedActions.includes(action.id)
                        ? "border-primary bg-primary/5"
                        : "border-border/50 bg-background/50 hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedActions.includes(action.id)}
                        onCheckedChange={() => toggleAction(action.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getActionIcon(action.actionType)}
                          <span className="text-sm font-medium truncate">
                            {action.description}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            {action.agentName}
                          </Badge>
                          <span>•</span>
                          <span>{formatDistanceToNow(new Date(action.createdAt), { addSuffix: true })}</span>
                          <span>•</span>
                          <span>{Math.round(action.confidenceScore * 100)}% confident</span>
                        </div>
                        
                        {/* Expandable reasoning */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 h-6 px-2 text-xs"
                          onClick={() => setExpandedAction(expandedAction === action.id ? null : action.id)}
                        >
                          {expandedAction === action.id ? (
                            <>
                              <ChevronUp className="h-3 w-3 mr-1" />
                              Hide reasoning
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3 w-3 mr-1" />
                              Show reasoning
                            </>
                          )}
                        </Button>
                        
                        {expandedAction === action.id && (
                          <div className="mt-2 p-2 rounded bg-muted/30 text-xs">
                            <p className="text-muted-foreground">{action.reasoning}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Action Buttons */}
            {selectedActions.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-border/50">
                <Textarea
                  placeholder="Optional: Add feedback for rejected actions..."
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  className="min-h-[60px]"
                />
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    variant="default"
                    onClick={() => approveMutation.mutate(selectedActions)}
                    disabled={approveMutation.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Approve ({selectedActions.length})
                  </Button>
                  <Button
                    className="flex-1"
                    variant="destructive"
                    onClick={() => rejectMutation.mutate({ actionIds: selectedActions, reason: feedbackText })}
                    disabled={rejectMutation.isPending}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject ({selectedActions.length})
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
