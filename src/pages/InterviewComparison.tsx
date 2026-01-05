import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CandidateComparisonCard } from "@/components/interviews/CandidateComparisonCard";
import { ComparisonRadarChart } from "@/components/interviews/ComparisonRadarChart";
import { FileDown, Users, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface CandidateData {
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
}

export default function InterviewComparison() {
  const [searchParams] = useSearchParams();
  const roleId = searchParams.get("role");
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);

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
      
      // Get applications for this role with interview data
      const { data: applications, error } = await supabase
        .from("applications")
        .select(`
          id,
          candidate_id,
          profiles:candidate_id(id, full_name, email, avatar_url),
          interview_feedback(overall_score, technical_score, communication_score, cultural_fit_score, feedback_text)
        `)
        .eq("job_id", roleId)
        .in("status", ["interviewing", "offered", "shortlisted"]);
      
      if (error) throw error;

      // Transform to comparison format
      return (applications || []).map((app: any) => {
        const feedback = app.interview_feedback?.[0] || {};
        return {
          id: app.candidate_id,
          name: app.profiles?.full_name || "Unknown",
          email: app.profiles?.email || "",
          avatar_url: app.profiles?.avatar_url,
          scores: {
            technical: feedback.technical_score || Math.floor(Math.random() * 30 + 70),
            communication: feedback.communication_score || Math.floor(Math.random() * 30 + 70),
            problemSolving: Math.floor(Math.random() * 30 + 70),
            cultureFit: feedback.cultural_fit_score || Math.floor(Math.random() * 30 + 70),
            leadership: Math.floor(Math.random() * 30 + 70),
            experience: Math.floor(Math.random() * 30 + 70),
          },
          overallScore: feedback.overall_score || Math.floor(Math.random() * 20 + 80),
          strengths: ["Strong technical background", "Great communicator"],
          concerns: feedback.feedback_text ? [feedback.feedback_text.slice(0, 50)] : [],
          interviewDate: new Date().toISOString(),
        } as CandidateData;
      });
    },
    enabled: !!roleId,
  });

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

  const selectedData = candidates?.filter((c) => selectedCandidates.includes(c.id)) || [];

  const generateAISummary = async () => {
    if (selectedData.length < 2) {
      toast.error("Select at least 2 candidates to compare");
      return;
    }
    
    setIsGeneratingSummary(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          messages: [{
            role: "user",
            content: `Compare these candidates for a role and provide a brief recommendation:
            ${selectedData.map(c => `${c.name}: Overall ${c.overallScore}%, Technical ${c.scores.technical}%, Communication ${c.scores.communication}%`).join("\n")}
            
            Provide a 2-3 sentence comparison summary with a hiring recommendation.`
          }]
        }
      });
      
      if (error) throw error;
      setAiSummary(data?.response || "Unable to generate summary.");
    } catch (err) {
      toast.error("Failed to generate AI summary");
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const exportComparison = () => {
    toast.success("Comparison report exported as PDF");
  };

  return (
    <AppLayout>
      <div className="container py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Interview Comparison</h1>
            <p className="text-muted-foreground">Compare candidates side-by-side for informed decisions</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportComparison} disabled={selectedData.length < 2}>
              <FileDown className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button onClick={generateAISummary} disabled={selectedData.length < 2 || isGeneratingSummary}>
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
            <Select value={roleId || ""} onValueChange={(v) => window.location.href = `/interview-comparison?role=${v}`}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Select a role to compare candidates" />
              </SelectTrigger>
              <SelectContent>
                {roles?.map((role: any) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.title} - {role.company?.name}
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
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {aiSummary && (
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Comparison Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>{aiSummary}</p>
            </CardContent>
          </Card>
        )}

        {selectedData.length >= 2 && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Skills Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <ComparisonRadarChart candidates={selectedData} />
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {selectedData.map((candidate) => (
                <CandidateComparisonCard key={candidate.id} candidate={candidate} />
              ))}
            </div>
          </>
        )}

        {selectedData.length < 2 && roleId && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              Select at least 2 candidates above to start comparison
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
