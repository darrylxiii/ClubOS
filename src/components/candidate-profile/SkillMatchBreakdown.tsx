import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, Star, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AssessmentBreakdown } from "@/hooks/useAssessmentScores";
import { candidateProfileTokens } from "@/config/candidate-profile-tokens";

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

  useEffect(() => {
    // Gather candidate skills
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

    // Fetch job requirements if job context
    if (jobId) {
      supabase.from('jobs').select('requirements').eq('id', jobId).single()
        .then(({ data }) => {
          if (data?.requirements) {
            const reqs = Array.isArray(data.requirements) ? data.requirements : [];
            const mustHave: string[] = [];
            const niceHave: string[] = [];
            reqs.forEach((r: any) => {
              const name = typeof r === 'string' ? r : r?.name || r?.skill || r?.label;
              if (!name) return;
              if (typeof r === 'object' && r?.priority === 'nice_to_have') {
                niceHave.push(name);
              } else {
                mustHave.push(name);
              }
            });
            setJobRequirements(mustHave);
            setJobNiceToHave(niceHave);
          }
        });
    }
  }, [candidateId, jobId, candidate, skills]);

  const normalizedCandidateSkills = candidateSkills.map(s => s.toLowerCase().trim());
  
  const isMatched = (skill: string) => {
    const normalized = skill.toLowerCase().trim();
    return normalizedCandidateSkills.some(cs => cs === normalized || cs.includes(normalized) || normalized.includes(cs));
  };

  const hasJobContext = jobId && (jobRequirements.length > 0 || jobNiceToHave.length > 0);

  if (candidateSkills.length === 0 && !hasJobContext) return null;

  return (
    <Card className={candidateProfileTokens.glass.card}>
      <CardHeader className="pb-3">
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
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Job Requirements Match */}
        {hasJobContext && jobRequirements.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-chart-2">Must-Have Requirements</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {jobRequirements.map((skill) => {
                const matched = isMatched(skill);
                return (
                  <div
                    key={skill}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border transition-all ${
                      matched
                        ? 'bg-chart-2/10 border-chart-2/20'
                        : 'bg-destructive/5 border-destructive/20'
                    }`}
                  >
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                      matched ? 'bg-chart-2/20' : 'bg-destructive/20'
                    }`}>
                      {matched ? (
                        <Check className="w-3.5 h-3.5 text-chart-2" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-destructive" />
                      )}
                    </div>
                    <span className={`text-sm ${matched ? 'text-foreground' : 'text-muted-foreground'}`}>{skill}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Nice to Have */}
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
                  <div
                    key={skill}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border ${
                      matched ? 'bg-accent/10 border-accent/20' : 'bg-muted/30 border-border/50'
                    }`}
                  >
                    <Star className={`w-3.5 h-3.5 ${matched ? 'text-accent fill-accent' : 'text-muted-foreground'}`} />
                    <span className="text-sm">{skill}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Candidate Skills (always shown) */}
        {candidateSkills.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">
              {hasJobContext ? 'All Candidate Skills' : 'Skills & Expertise'}
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {candidateSkills.map((skill) => (
                <Badge key={skill} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
