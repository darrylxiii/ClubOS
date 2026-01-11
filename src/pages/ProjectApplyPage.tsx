import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/lib/notify';
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  CheckCircle2,
  Zap
} from "lucide-react";

export default function ProjectApplyPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [coverLetter, setCoverLetter] = useState("");
  const [proposedRate, setProposedRate] = useState("");
  const [proposedTimeline, setProposedTimeline] = useState("");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const { data: freelanceProfile } = useQuery({
    queryKey: ["freelance-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await (supabase as any)
        .from("freelance_profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const generateAIProposal = async () => {
    if (!projectId || !user?.id) return;

    setIsGeneratingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-project-proposal",
        {
          body: { projectId, freelancerId: user.id },
        }
      );

      if (error) throw error;

      if (data?.proposal) {
        setCoverLetter(data.proposal.cover_letter);
        setProposedRate(data.proposal.proposed_rate?.toString() || "");
        setProposedTimeline(data.proposal.proposed_timeline_weeks?.toString() || "");

        toast({
          title: "AI Proposal Generated",
          description: "Review and edit the proposal before submitting",
        });
      }
    } catch (error: any) {
      console.error("Error generating proposal:", error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate AI proposal",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const submitProposal = useMutation({
    mutationFn: async () => {
      if (!user?.id || !projectId) throw new Error("Missing required data");

      const { data, error } = await (supabase as any)
        .from("project_proposals")
        .insert({
          project_id: projectId,
          freelancer_id: user.id,
          cover_letter: coverLetter,
          proposed_rate: proposedRate ? parseFloat(proposedRate) : null,
          proposed_timeline_weeks: proposedTimeline ? parseInt(proposedTimeline) : null,
          proposal_type: "manual",
          status: "submitted",
          submitted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Proposal Submitted",
        description: "Your proposal has been sent successfully",
      });
      navigate(`/projects/${projectId}`);
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit proposal",
        variant: "destructive",
      });
    },
  });

  if (!freelanceProfile) {
    return (
      <div className="container mx-auto py-12 text-center max-w-2xl">
        <Card className="p-8">
          <h2 className="text-2xl font-bold mb-4">Become a Freelancer</h2>
          <p className="text-muted-foreground mb-6">
            You need to set up your freelance profile before applying to projects
          </p>
          <Button onClick={() => navigate("/projects/freelancer/setup")}>
            Set Up Profile
          </Button>
        </Card>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <SectionLoader />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/projects/${projectId}`)}
          className="gap-2 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Project
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Apply to Project</h1>
            <p className="text-muted-foreground">{project.title}</p>
          </div>

          <Button
            onClick={generateAIProposal}
            disabled={isGeneratingAI}
            variant="outline"
            className="gap-2"
          >
            {isGeneratingAI ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate with AI
              </>
            )}
          </Button>
        </div>
      </div>

      {/* AI Banner */}
      <Card className="p-4 mb-6 bg-primary/5 border-primary/20">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold mb-1">Club AI Proposal Generator</h3>
            <p className="text-sm text-muted-foreground">
              Let Club AI write a tailored proposal based on your profile and this project.
              You can review and edit before submitting.
            </p>
          </div>
        </div>
      </Card>

      {/* Proposal Form */}
      <div className="space-y-6">
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="cover-letter">Cover Letter *</Label>
              <Textarea
                id="cover-letter"
                placeholder="Explain why you're the perfect fit for this project..."
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                rows={12}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {coverLetter.length} characters • Aim for 400-600 words
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="rate">
                  Proposed Rate *
                  {project.engagement_type === "hourly" ? " (per hour)" : " (total)"}
                </Label>
                <div className="relative mt-2">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    €
                  </span>
                  <Input
                    id="rate"
                    type="number"
                    placeholder="0"
                    value={proposedRate}
                    onChange={(e) => setProposedRate(e.target.value)}
                    className="pl-8"
                  />
                </div>
                {freelanceProfile.hourly_rate_min && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Your typical rate: €{freelanceProfile.hourly_rate_min}-
                    {freelanceProfile.hourly_rate_max}/hr
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="timeline">Proposed Timeline (weeks) *</Label>
                <Input
                  id="timeline"
                  type="number"
                  placeholder="0"
                  value={proposedTimeline}
                  onChange={(e) => setProposedTimeline(e.target.value)}
                  className="mt-2"
                />
                {project.timeline_weeks && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Client expects: {project.timeline_weeks} weeks
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Preview Card */}
        {coverLetter && (
          <Card className="p-6 bg-muted/50">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Proposal Preview
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">Rate:</span>{" "}
                <span className="font-medium">
                  €{proposedRate || "0"}
                  {project.engagement_type === "hourly" ? "/hr" : " total"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Timeline:</span>{" "}
                <span className="font-medium">
                  {proposedTimeline || "0"} weeks
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Cover Letter:</span>{" "}
                <span className="font-medium">{coverLetter.length} characters</span>
              </div>
            </div>
          </Card>
        )}

        {/* Submit Button */}
        <div className="flex items-center justify-between pt-4">
          <Button
            variant="outline"
            onClick={() => navigate(`/projects/${projectId}`)}
          >
            Cancel
          </Button>

          <Button
            onClick={() => submitProposal.mutate()}
            disabled={
              !coverLetter ||
              !proposedRate ||
              !proposedTimeline ||
              submitProposal.isPending
            }
            size="lg"
            className="gap-2"
          >
            {submitProposal.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                Submit Proposal
                <ArrowLeft className="h-4 w-4 rotate-180" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
