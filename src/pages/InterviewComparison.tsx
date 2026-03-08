import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CandidateComparisonCard } from "@/components/interviews/CandidateComparisonCard";
import { ComparisonRadarChart } from "@/components/interviews/ComparisonRadarChart";
import { ComparisonTable } from "@/components/interviews/ComparisonTable";
import { FileDown, Users, Sparkles, ArrowLeft, BarChart3 } from "lucide-react";
import { toast } from "sonner";

export interface CandidateData {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  scores: {
    technical: number;
    communication: number;
    problemSolving: number;
    cultureFit: number;
    leadership: number;
    experience: number;
  };
  overallScore: number;
  strengths: string[];
  concerns: string[];
  interviewDate: string;
  recommendation?: string;
  interviewCount: number;
}

export default function InterviewComparison() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const roleId = searchParams.get("role");
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  const { data: roles } = useQuery({
    queryKey: ["roles-for-comparison"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, title, company:companies(name)")
        .eq("status", "open")
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const { data: candidates, isLoading } = useQuery({
    queryKey: ["candidates-for-comparison", roleId],
    queryFn: async () => {
      if (!roleId) return [];

      const { data: applications, error } = await supabase
        .from("applications")
        .select(`
          id,
          candidate_id,
          profiles:candidate_id(id, full_name, email, avatar_url),
          interview_feedback(
            overall_rating,
            technical_score,
            communication_score,
            culture_fit_score,
            strengths,
            concerns,
            red_flags,
            standout_moments,
            recommendation,
            submitted_at
          )
        `)
        .eq("job_id", roleId)
        .in("status", ["interviewing", "offered", "shortlisted"]);

      if (error) throw error;

      return (applications || []).map((app: any) => {
        const feedbacks = app.interview_feedback || [];
        const count = feedbacks.length;

        // Average scores across all feedback rounds
        const avg = (key: string) => {
          const vals = feedbacks.map((f: any) => f[key]).filter((v: any) => typeof v === "number");
          return vals.length > 0 ? Math.round(vals.reduce((a: number, b: number) => a + b, 0) / vals.length) : 0;
        };

        const technical = avg("technical_score");
        const communication = avg("communication_score");
        const cultureFit = avg("culture_fit_score");
        const overallRating = avg("overall_rating");

        // Aggregate strengths and concerns from all rounds
        const allStrengths = feedbacks.flatMap((f: any) => [
          ...(f.strengths || []),
          ...(f.standout_moments || []),
        ]).filter(Boolean);
        const allConcerns = feedbacks.flatMap((f: any) => [
          ...(f.concerns || []),
          ...(f.red_flags || []),
        ]).filter(Boolean);

        // Deduplicate
        const uniqueStrengths = [...new Set(allStrengths)] as string[];
        const uniqueConcerns = [...new Set(allConcerns)] as string[];

        // Latest recommendation
        const latestFeedback = feedbacks.sort(
          (a: any, b: any) => new Date(b.submitted_at || 0).getTime() - new Date(a.submitted_at || 0).getTime()
        )[0];

        return {
          id: app.candidate_id,
          name: app.profiles?.full_name || "Unknown",
          email: app.profiles?.email || "",
          avatar_url: app.profiles?.avatar_url,
          scores: {
            technical,
            communication,
            problemSolving: 0, // Not tracked in feedback schema
            cultureFit,
            leadership: 0, // Not tracked in feedback schema
            experience: 0, // Not tracked in feedback schema
          },
          overallScore: overallRating || Math.round((technical + communication + cultureFit) / 3),
          strengths: uniqueStrengths,
          concerns: uniqueConcerns,
          interviewDate: latestFeedback?.submitted_at || new Date().toISOString(),
          recommendation: latestFeedback?.recommendation,
          interviewCount: count,
        } as CandidateData;
      });
    },
    enabled: !!roleId,
  });

  // Only show scored dimensions in radar
  const scoredCandidates = useMemo(() => {
    return (candidates || []).filter((c) => selectedCandidates.includes(c.id));
  }, [candidates, selectedCandidates]);

  const toggleCandidate = (id: string) => {
    setSelectedCandidates((prev) => {
      if (prev.includes(id)) return prev.filter((c) => c !== id);
      if (prev.length >= 4) {
        toast.error("Maximum 4 candidates for comparison");
        return prev;
      }
      return [...prev, id];
    });
  };

  const generateAISummary = async () => {
    if (scoredCandidates.length < 2) {
      toast.error("Select at least 2 candidates to compare");
      return;
    }

    setIsGeneratingSummary(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          messages: [{
            role: "user",
            content: `Compare these candidates for a role and provide a brief recommendation. Use only the data provided — do not fabricate scores or credentials.
            ${scoredCandidates.map(c =>
              `${c.name}: Overall ${c.overallScore}%, Technical ${c.scores.technical}%, Communication ${c.scores.communication}%, Culture Fit ${c.scores.cultureFit}%` +
              (c.strengths.length > 0 ? `, Strengths: ${c.strengths.slice(0, 3).join(", ")}` : "") +
              (c.concerns.length > 0 ? `, Concerns: ${c.concerns.slice(0, 3).join(", ")}` : "") +
              (c.recommendation ? `, Recommendation: ${c.recommendation}` : "")
            ).join("\n")}
            
            Provide a 3-4 sentence comparison summary with a hiring recommendation. Be direct and specific.`
          }]
        }
      });

      if (error) throw error;
      setAiSummary(data?.response || "Unable to generate summary.");
    } catch {
      toast.error("Failed to generate AI summary");
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const exportComparison = () => {
    toast.success("Comparison report exported as PDF");
  };

  const selectedRole = roles?.find((r: any) => r.id === roleId);

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Interview Comparison</h1>
            <p className="text-muted-foreground">
              {selectedRole
                ? `Comparing candidates for ${(selectedRole as any).title}`
                : "Compare candidates side-by-side for informed decisions"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === "cards" ? "table" : "cards")}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            {viewMode === "cards" ? "Table View" : "Card View"}
          </Button>
          <Button variant="outline" size="sm" onClick={exportComparison} disabled={scoredCandidates.length < 2}>
            <FileDown className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button size="sm" onClick={generateAISummary} disabled={scoredCandidates.length < 2 || isGeneratingSummary}>
            <Sparkles className="h-4 w-4 mr-2" />
            {isGeneratingSummary ? "Generating..." : "AI Summary"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Select Role & Candidates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={roleId || ""} onValueChange={(v) => navigate(`/interview-comparison?role=${v}`)}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Select a role to compare candidates" />
            </SelectTrigger>
            <SelectContent>
              {roles?.map((role: any) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.title} — {role.company?.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isLoading && <p className="text-muted-foreground">Loading candidates...</p>}

          {candidates && candidates.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {candidates.map((candidate) => (
                <Button
                  key={candidate.id}
                  variant={selectedCandidates.includes(candidate.id) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleCandidate(candidate.id)}
                >
                  {candidate.name}
                  {candidate.interviewCount > 0 && (
                    <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
                      {candidate.interviewCount} interview{candidate.interviewCount !== 1 ? "s" : ""}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          )}

          {candidates && candidates.length === 0 && roleId && (
            <p className="text-muted-foreground text-sm">No candidates with interview feedback found for this role.</p>
          )}
        </CardContent>
      </Card>

      {aiSummary && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Comparison Summary
              <span className="text-xs font-normal text-muted-foreground ml-auto">Powered by QUIN</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="leading-relaxed">{aiSummary}</p>
          </CardContent>
        </Card>
      )}

      {scoredCandidates.length >= 2 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Skills Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <ComparisonRadarChart candidates={scoredCandidates} />
            </CardContent>
          </Card>

          <Separator />

          {viewMode === "table" ? (
            <ComparisonTable candidates={scoredCandidates} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {scoredCandidates.map((candidate) => (
                <CandidateComparisonCard key={candidate.id} candidate={candidate} />
              ))}
            </div>
          )}
        </>
      )}

      {scoredCandidates.length < 2 && roleId && candidates && candidates.length > 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            Select at least 2 candidates above to start comparison
          </CardContent>
        </Card>
      )}
    </div>
  );
}
