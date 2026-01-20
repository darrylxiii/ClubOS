import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import {
  FileText, DollarSign, Clock, Sparkles, Send,
  CheckCircle2, AlertCircle, Video, Plus, X,
  ArrowLeft, Briefcase, Target
} from "lucide-react";

interface ProposalBuilderProps {
  projectId: string;
  project?: any;
  onSuccess?: () => void;
}

export function ProposalBuilder({ projectId, project, onSuccess }: ProposalBuilderProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    cover_letter: "",
    proposed_rate: project?.budget_min || 50,
    proposed_timeline_weeks: project?.timeline_weeks || 4,
    portfolio_highlights: [] as { title: string; url: string }[],
    availability_statement: "",
    questions_for_client: [] as string[],
    use_ai_enhancement: false,
  });
  
  const [newQuestion, setNewQuestion] = useState("");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["freelance-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("freelance_profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: existingProposal } = useQuery({
    queryKey: ["existing-proposal", projectId, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("project_proposals")
        .select("*")
        .eq("project_id", projectId)
        .eq("freelancer_id", user.id)
        .single();
      return data;
    },
    enabled: !!user?.id && !!projectId,
  });

  const submitProposalMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!user?.id) throw new Error("Not authenticated");

      const proposalData = {
        project_id: projectId,
        freelancer_id: user.id,
        cover_letter: data.cover_letter,
        proposed_rate: data.proposed_rate,
        proposed_timeline_weeks: data.proposed_timeline_weeks,
        availability_statement: data.availability_statement,
        status: "submitted" as const,
        submitted_at: new Date().toISOString(),
      };

      const { data: proposal, error } = await (supabase as any)
        .from("project_proposals")
        .insert(proposalData)
        .select()
        .single();

      if (error) throw error;
      return proposal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-proposals"] });
      toast.success("Proposal submitted successfully!");
      onSuccess?.();
      navigate(`/projects/${projectId}`);
    },
    onError: (error) => {
      toast.error("Failed to submit proposal: " + error.message);
    },
  });

  const generateAICoverLetter = async () => {
    if (!project) return;
    
    setIsGeneratingAI(true);
    try {
      // Simulate AI generation (replace with actual AI call)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const generatedLetter = `Dear Hiring Manager,

I am excited to apply for the ${project.title} project. With ${profile?.total_completed_projects || 0} successfully completed projects and expertise in ${project.required_skills?.slice(0, 3).join(", ") || "relevant technologies"}, I am confident I can deliver exceptional results.

Based on my review of your requirements, I understand you need:
${project.description?.substring(0, 200)}...

I propose to complete this project within ${formData.proposed_timeline_weeks} weeks at a rate of €${formData.proposed_rate}/hour. My approach would include:

1. Initial discovery and requirement refinement
2. Iterative development with regular check-ins
3. Thorough testing and quality assurance
4. Comprehensive documentation and handover

I would love to discuss this opportunity further. Please feel free to reach out with any questions.

Best regards`;

      setFormData({ ...formData, cover_letter: generatedLetter });
      toast.success("AI-enhanced cover letter generated!");
    } catch (error) {
      toast.error("Failed to generate AI cover letter");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const addQuestion = () => {
    if (newQuestion.trim()) {
      setFormData({
        ...formData,
        questions_for_client: [...formData.questions_for_client, newQuestion.trim()]
      });
      setNewQuestion("");
    }
  };

  const removeQuestion = (index: number) => {
    setFormData({
      ...formData,
      questions_for_client: formData.questions_for_client.filter((_, i) => i !== index)
    });
  };

  const addPortfolioItem = () => {
    setFormData({
      ...formData,
      portfolio_highlights: [...formData.portfolio_highlights, { title: "", url: "" }]
    });
  };

  const updatePortfolioItem = (index: number, field: "title" | "url", value: string) => {
    const updated = [...formData.portfolio_highlights];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, portfolio_highlights: updated });
  };

  const removePortfolioItem = (index: number) => {
    setFormData({
      ...formData,
      portfolio_highlights: formData.portfolio_highlights.filter((_, i) => i !== index)
    });
  };

  if (existingProposal) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="py-12 text-center">
          <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Proposal Already Submitted</h2>
          <p className="text-muted-foreground mb-6">
            You have already submitted a proposal for this project.
            Status: <Badge className="ml-2">{existingProposal.status}</Badge>
          </p>
          <Button onClick={() => navigate(`/projects/${projectId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Project
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Submit Your Proposal
          </CardTitle>
        </div>
        {project && (
          <CardDescription>
            Applying for: {project.title}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Cover Letter */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Cover Letter *</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={generateAICoverLetter}
              disabled={isGeneratingAI}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {isGeneratingAI ? "Generating..." : "AI Enhance"}
            </Button>
          </div>
          <Textarea
            placeholder="Introduce yourself and explain why you're the best fit for this project..."
            rows={10}
            value={formData.cover_letter}
            onChange={(e) => setFormData({ ...formData, cover_letter: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            {formData.cover_letter.length}/2000 characters
          </p>
        </div>

        {/* Proposed Rate */}
        <div className="space-y-3">
          <Label>Proposed Rate (€/hour): €{formData.proposed_rate}</Label>
          <Slider
            value={[formData.proposed_rate]}
            onValueChange={([value]) => setFormData({ ...formData, proposed_rate: value })}
            min={10}
            max={500}
            step={5}
          />
          {project && (
            <p className="text-xs text-muted-foreground">
              Client budget: €{project.budget_min} - €{project.budget_max}/hr
            </p>
          )}
        </div>

        {/* Proposed Timeline */}
        <div className="space-y-3">
          <Label>Proposed Timeline: {formData.proposed_timeline_weeks} weeks</Label>
          <Slider
            value={[formData.proposed_timeline_weeks]}
            onValueChange={([value]) => setFormData({ ...formData, proposed_timeline_weeks: value })}
            min={1}
            max={52}
            step={1}
          />
          {project && (
            <p className="text-xs text-muted-foreground">
              Client timeline: {project.timeline_weeks} weeks
            </p>
          )}
        </div>

        {/* Availability Statement */}
        <div className="space-y-2">
          <Label>Availability Statement</Label>
          <Textarea
            placeholder="Describe your current availability and when you can start..."
            rows={3}
            value={formData.availability_statement}
            onChange={(e) => setFormData({ ...formData, availability_statement: e.target.value })}
          />
        </div>

        {/* Portfolio Highlights */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Portfolio Highlights</Label>
            <Button variant="outline" size="sm" onClick={addPortfolioItem}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
          
          {formData.portfolio_highlights.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add relevant portfolio items to strengthen your proposal
            </p>
          ) : (
            <div className="space-y-3">
              {formData.portfolio_highlights.map((item, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="Project title"
                    value={item.title}
                    onChange={(e) => updatePortfolioItem(index, "title", e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="URL"
                    value={item.url}
                    onChange={(e) => updatePortfolioItem(index, "url", e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removePortfolioItem(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Questions for Client */}
        <div className="space-y-3">
          <Label>Questions for the Client</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Ask a clarifying question..."
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addQuestion()}
            />
            <Button variant="outline" onClick={addQuestion}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          {formData.questions_for_client.length > 0 && (
            <div className="space-y-2">
              {formData.questions_for_client.map((question, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                  <span className="flex-1 text-sm">{question}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeQuestion(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Enhancement Toggle */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Club AI Enhancement</p>
                  <p className="text-sm text-muted-foreground">
                    Let AI optimize your proposal for better visibility
                  </p>
                </div>
              </div>
              <Switch
                checked={formData.use_ai_enhancement}
                onCheckedChange={(checked) => setFormData({ ...formData, use_ai_enhancement: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-4 pt-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate(-1)}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 gap-2"
            onClick={() => submitProposalMutation.mutate(formData)}
            disabled={
              submitProposalMutation.isPending ||
              formData.cover_letter.length < 50
            }
          >
            <Send className="h-4 w-4" />
            {submitProposalMutation.isPending ? "Submitting..." : "Submit Proposal"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
