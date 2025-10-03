import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertCircle, MessageSquare, Building2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { FeedbackFlow } from "./FeedbackFlow";
import { toast } from "sonner";

interface ClosedPipeline {
  id: string;
  application_id: string;
  company_name: string;
  position: string;
  outcome: "hired" | "not_hired" | "withdrew";
  closed_at: string;
  feedback_completed: boolean;
}

export const PendingFeedbackTasks = () => {
  const { user } = useAuth();
  const [pendingFeedback, setPendingFeedback] = useState<ClosedPipeline[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<ClosedPipeline | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);

  useEffect(() => {
    if (user) {
      fetchPendingFeedback();
    }
  }, [user]);

  const fetchPendingFeedback = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("closed_pipelines")
        .select("*")
        .eq("feedback_completed", false)
        .order("closed_at", { ascending: false });

      if (error) throw error;
      setPendingFeedback((data || []) as ClosedPipeline[]);
    } catch (error) {
      console.error("Error fetching pending feedback:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartFeedback = (pipeline: ClosedPipeline) => {
    setSelectedPipeline(pipeline);
    setShowFeedbackDialog(true);
  };

  const handleFeedbackComplete = () => {
    setShowFeedbackDialog(false);
    setSelectedPipeline(null);
    fetchPendingFeedback();
    toast.success("Feedback submitted successfully!");
  };

  const getOutcomeBadge = (outcome: string) => {
    switch (outcome) {
      case "hired":
        return <Badge className="bg-success text-success-foreground">🎉 Hired</Badge>;
      case "not_hired":
        return <Badge variant="secondary">Not Selected</Badge>;
      case "withdrew":
        return <Badge variant="outline">Withdrew</Badge>;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <Card className="border-2 border-muted">
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">Loading feedback tasks...</p>
        </CardContent>
      </Card>
    );
  }

  if (pendingFeedback.length === 0) {
    return (
      <Card className="border-2 border-border bg-card/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-success" />
            <CardTitle className="text-lg font-black">Feedback Tasks</CardTitle>
          </div>
          <CardDescription>All feedback completed! Thank you for your input.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-2 border-accent/50 bg-gradient-card shadow-glow">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-accent animate-pulse" />
            <CardTitle className="text-lg font-black">Pending Feedback</CardTitle>
          </div>
          <CardDescription>
            {pendingFeedback.length} pipeline{pendingFeedback.length !== 1 ? "s" : ""} awaiting
            your feedback
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingFeedback.map((pipeline) => (
            <div
              key={pipeline.id}
              className="p-4 rounded-lg border-2 border-border hover:border-accent/50 transition-all bg-background space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <h4 className="font-bold text-sm truncate">{pipeline.company_name}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{pipeline.position}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Closed {formatDate(pipeline.closed_at)}
                  </p>
                </div>
                {getOutcomeBadge(pipeline.outcome)}
              </div>

              <Button
                onClick={() => handleStartFeedback(pipeline)}
                size="sm"
                className="w-full bg-accent hover:bg-accent/90"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Provide Feedback
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Share Your Experience</DialogTitle>
            <DialogDescription>
              Your feedback is invaluable in helping us improve our service
            </DialogDescription>
          </DialogHeader>
          {selectedPipeline && (
            <FeedbackFlow
              applicationId={selectedPipeline.application_id}
              companyName={selectedPipeline.company_name}
              position={selectedPipeline.position}
              outcome={selectedPipeline.outcome}
              onComplete={handleFeedbackComplete}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
