import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, Star, Target, Wand2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AssessmentBreakdown } from "@/hooks/useAssessmentScores";
import { candidateProfileTokens } from "@/config/candidate-profile-tokens";
import { toast } from "sonner";

interface SkillMatchBreakdownProps {
  candidateId: string;
  candidate: any;
  jobId?: string | null;
  breakdown: AssessmentBreakdown | null;
  skills?: any[];
}

export function SkillMatchBreakdown({ candidateId, candidate, jobId, breakdown, skills = [] }: SkillMatchBreakdownProps) {
  const [jobRequirements, setJobRequirements] = useState<string[]>([]);
  const [jobNiceToHave, setJobNiceToHave] = useState<string[]>([]);
  const [candidateSkills, setCandidateSkills] = useState<string[]>([]);
  const [extracting, setExtracting] = useState(false);

  useEffect(() => {
    const allSkills = new Set<string>();
    skills.forEach((s: any) => {
      if (s.skill_name) allSkills.add(s.skill_name);
    });
    if (candidate?.skills && Array.isArray(candidate.skills)) {
      candidate.skills.forEach((s: any) => {
        const name = typeof s === 'string' ? s : s?.name || s?.skill;
        if (name) allSkills.add(name);
      });
    }
    setCandidateSkills(Array.from(allSkills));

    if (jobId) {
      supabase.from('jobs').select('requirements, nice_to_have').eq('id', jobId).single()
        .then(({ data }) => {
          if (data?.requirements && Array.isArray(data.requirements)) {
            setJobRequirements(data.requirements.map((r: any) =>
              typeof r === 'string' ? r : r?.name || r?.skill || r?.label || ''
            ).filter(Boolean));
          }
          if (data?.nice_to_have && Array.isArray(data.nice_to_have)) {
            setJobNiceToHave(data.nice_to_have.map((r: any) =>
              typeof r === 'string' ? r : r?.name || ''
            ).filter(Boolean));
          }
        });
    }
  }, [candidateId, jobId, candidate, skills]);

  const extractSkills = async () => {
    setExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke('extract-skills-from-experience', {
        body: { candidate_id: candidateId },
      });
      if (error) throw error;
      const result = data?.results?.[0];
      if (result?.skills_extracted > 0) {
        toast.success(`Extracted ${result.skills_extracted} skills from work history`);
        // Refresh page to show new skills
        window.location.reload();
      } else {
        toast.info('No new skills could be extracted');
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to extract skills');
    } finally {
      setExtracting(false);
    }
  };

  const normalizedCandidateSkills = candidateSkills.map(s => s.toLowerCase().trim());
  
  const isMatched = (skill: string) => {
    const normalized = skill.toLowerCase().trim();
    return normalizedCandidateSkills.some(cs => cs === normalized || cs.includes(normalized) || normalized.includes(cs));
  };

  const hasJobContext = jobId && (jobRequirements.length > 0 || jobNiceToHave.length > 0);
  const noSkills = candidateSkills.length === 0;

  return (
    <Card className={candidateProfileTokens.glass.card}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="w-5 h-5 text-primary" />
            <div>
              <CardTitle className="text-base">Skills & Requirements</CardTitle>
              {hasJobContext && breakdown?.skills_match && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {breakdown.skills_match.details}
                </p>
              )}
            </div>
          </div>
          {noSkills && (
            <Button
              variant="outline"
              size="sm"
              onClick={extractSkills}
              disabled={extracting}
              className="text-xs"
            >
              {extracting ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <Wand2 className="w-3 h-3 mr-1" />
              )}
              {extracting ? 'Extracting...' : 'Extract from CV'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {noSkills && !hasJobContext && (
          <div className="text-center py-4 text-muted-foreground">
            <p className="text-sm">No skills data available</p>
            <p className="text-xs mt-1">Use "Extract from CV" to populate skills from work history and education</p>
          </div>
        )}

        {hasJobContext && jobRequirements.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-chart-2">Must-Have Requirements</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {jobRequirements.map((skill) => {
                const matched = isMatched(skill);
                return (
                  <div key={skill} className={`flex items-center gap-2 p-2.5 rounded-lg border transition-all ${
                    matched ? 'bg-chart-2/10 border-chart-2/20' : 'bg-destructive/5 border-destructive/20'
                  }`}>
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                      matched ? 'bg-chart-2/20' : 'bg-destructive/20'
                    }`}>
                      {matched ? <Check className="w-3.5 h-3.5 text-chart-2" /> : <X className="w-3.5 h-3.5 text-destructive" />}
                    </div>
                    <span className={`text-sm ${matched ? 'text-foreground' : 'text-muted-foreground'}`}>{skill}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {hasJobContext && jobNiceToHave.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-accent">Nice-to-Have</h4>
              <Badge variant="outline" className="text-[10px]">Bonus</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {jobNiceToHave.map((skill) => {
                const matched = isMatched(skill);
                return (
                  <div key={skill} className={`flex items-center gap-2 p-2.5 rounded-lg border ${
                    matched ? 'bg-accent/10 border-accent/20' : 'bg-muted/30 border-border/50'
                  }`}>
                    <Star className={`w-3.5 h-3.5 ${matched ? 'text-accent fill-accent' : 'text-muted-foreground'}`} />
                    <span className="text-sm">{skill}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {candidateSkills.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">
              {hasJobContext ? 'All Candidate Skills' : 'Skills & Expertise'}
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {candidateSkills.map((skill) => (
                <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
              ))}
            </div>
          </div>
        )}

        {hasJobContext && jobRequirements.length === 0 && (
          <div className="text-center py-3 text-muted-foreground border border-dashed rounded-lg">
            <p className="text-sm">Job has no parsed requirements</p>
            <p className="text-xs mt-1">Requirements will be auto-extracted from the job description</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
