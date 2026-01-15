import { useState } from "react";
import { aiService } from '@/services/aiService';
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Coins, Zap, Sparkles, Send, Loader2, AlertCircle,
  Clock, DollarSign, Video, FileText, CheckCircle
} from "lucide-react";
import { toast } from "sonner";

interface EnhancedProposalBuilderProps {
  projectId: string;
  projectTitle: string;
  projectBudgetMin?: number;
  projectBudgetMax?: number;
  onSubmitSuccess?: () => void;
}

export function EnhancedProposalBuilder({
  projectId,
  projectTitle,
  projectBudgetMin = 0,
  projectBudgetMax = 0,
  onSubmitSuccess,
}: EnhancedProposalBuilderProps) {
  const { user } = useAuth();
  const [coverLetter, setCoverLetter] = useState("");
  const [proposedRate, setProposedRate] = useState("");
  const [estimatedDuration, setEstimatedDuration] = useState("");
  const [isBoosted, setIsBoosted] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Calculate connects cost
  const avgBudget = (projectBudgetMin + projectBudgetMax) / 2;
  let baseConnectsCost = 2;
  if (avgBudget >= 5000) baseConnectsCost = 6;
  else if (avgBudget >= 500) baseConnectsCost = 4;

  const connectsCost = isBoosted ? Math.ceil(baseConnectsCost * 1.5) : baseConnectsCost;

  // Get freelancer profile with connects balance
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["freelance-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("freelance_profiles")
        .select("id, connects_balance, professional_summary, categories, hourly_rate_min")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const hasEnoughConnects = (profile?.connects_balance ?? 0) >= connectsCost;

  // Submit proposal mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      // First deduct connects
      const { data: deductResult, error: deductError } = await supabase.functions.invoke("deduct-connects", {
        body: {
          projectId,
          proposalType: isBoosted ? "boosted" : "standard"
        },
      });

      if (deductError || deductResult?.error) {
        throw new Error(deductResult?.error || deductError?.message || "Failed to deduct connects");
      }

      // Then create proposal
      const { error: proposalError } = await supabase
        .from("project_proposals")
        .insert([{
          project_id: projectId,
          freelancer_id: profile?.id,
          cover_letter: coverLetter,
          proposed_rate: parseFloat(proposedRate),
          proposed_timeline_weeks: parseInt(estimatedDuration) || 1,
          is_boosted: isBoosted,
          connects_used: connectsCost,
          status: "submitted" as const,
        }]);

      if (proposalError) throw proposalError;

      return { newBalance: deductResult.newBalance };
    },
    onSuccess: (data) => {
      toast.success("Proposal submitted!", {
        description: `${connectsCost} connects deducted. Balance: ${data.newBalance}`,
      });
      onSubmitSuccess?.();
    },
    onError: (error: Error) => {
      toast.error("Failed to submit proposal", { description: error.message });
    },
  });

  // Generate AI cover letter
  const generateAICoverLetter = async () => {
    setIsGeneratingAI(true);
    try {
      const response = await aiService.generateProjectProposal({
        projectId,
        freelancerId: profile?.id
      });

      if (!response.success) throw new Error(response.error || "Failed to generate");

      if (response.proposal?.coverLetter) {
        setCoverLetter(response.proposal.coverLetter);
        toast.success("AI cover letter generated!");
      }
    } catch (error) {
      toast.error("Failed to generate cover letter");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  if (profileLoading) {
    return (
      <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Submit Proposal
        </CardTitle>
        <CardDescription>
          Apply for: {projectTitle}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connects Cost Display */}
        <div className={`p-4 rounded-lg border ${hasEnoughConnects ? 'bg-primary/5 border-primary/20' : 'bg-destructive/5 border-destructive/20'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-primary" />
              <span className="font-medium">Connects Required</span>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{connectsCost}</span>
                <span className="text-muted-foreground">connects</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Your balance: {profile?.connects_balance ?? 0}
              </p>
            </div>
          </div>

          {!hasEnoughConnects && (
            <div className="mt-3 flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>You need {connectsCost - (profile?.connects_balance ?? 0)} more connects</span>
            </div>
          )}
        </div>

        {/* Boost Option */}
        <div className="flex items-center justify-between p-4 rounded-lg border border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Zap className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="font-medium">Boost this proposal</p>
              <p className="text-sm text-muted-foreground">
                +50% connects for priority placement
              </p>
            </div>
          </div>
          <Switch
            checked={isBoosted}
            onCheckedChange={setIsBoosted}
          />
        </div>

        <Separator />

        {/* Cover Letter */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="coverLetter">Cover Letter</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={generateAICoverLetter}
              disabled={isGeneratingAI}
            >
              {isGeneratingAI ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Generate with AI
            </Button>
          </div>
          <Textarea
            id="coverLetter"
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            placeholder="Explain why you're the perfect fit for this project..."
            className="min-h-[150px]"
          />
          <p className="text-xs text-muted-foreground">
            {coverLetter.length}/2000 characters
          </p>
        </div>

        {/* Rate and Duration */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="rate" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Your Rate
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
              <Input
                id="rate"
                type="number"
                value={proposedRate}
                onChange={(e) => setProposedRate(e.target.value)}
                placeholder="50"
                className="pl-8"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Budget: €{projectBudgetMin.toLocaleString()} - €{projectBudgetMax.toLocaleString()}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Estimated Duration
            </Label>
            <Input
              id="duration"
              value={estimatedDuration}
              onChange={(e) => setEstimatedDuration(e.target.value)}
              placeholder="e.g., 2 weeks"
            />
          </div>
        </div>

        {/* Video & Portfolio (placeholders) */}
        <div className="grid grid-cols-2 gap-4">
          <Button variant="outline" className="h-auto py-4 flex-col gap-2" disabled>
            <Video className="h-5 w-5" />
            <span className="text-xs">Add Video Intro</span>
            <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
          </Button>
          <Button variant="outline" className="h-auto py-4 flex-col gap-2" disabled>
            <FileText className="h-5 w-5" />
            <span className="text-xs">Attach Portfolio</span>
            <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
          </Button>
        </div>

        <Separator />

        {/* Submit Button */}
        <Button
          onClick={() => submitMutation.mutate()}
          disabled={!hasEnoughConnects || !coverLetter || !proposedRate || submitMutation.isPending}
          className="w-full"
          size="lg"
        >
          {submitMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Submit Proposal ({connectsCost} connects)
            </>
          )}
        </Button>

        {/* Success Indicators */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground justify-center">
          <div className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-green-500" />
            Verified freelancer
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-green-500" />
            Secure payment
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
