import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  User, 
  Briefcase, 
  MapPin, 
  Star, 
  FileText, 
  ChevronDown,
  ChevronUp,
  Sparkles,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface CandidateBriefPanelProps {
  candidateId: string;
  applicationId?: string;
  jobId?: string;
  compact?: boolean;
}

interface CandidateData {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  current_title?: string;
  current_company?: string;
  fit_score?: number;
  skills?: string[];
  years_of_experience?: number;
  desired_locations?: string[];
}

interface ApplicationData {
  id: string;
  status: string;
  current_stage_index: number;
  created_at: string;
  position?: string;
  company_name?: string;
}

export function CandidateBriefPanel({
  candidateId,
  applicationId,
  jobId,
  compact = false,
}: CandidateBriefPanelProps) {
  const [candidate, setCandidate] = useState<CandidateData | null>(null);
  const [application, setApplication] = useState<ApplicationData | null>(null);
  const [interviewScores, setInterviewScores] = useState<any[]>([]);
  const [talkingPoints, setTalkingPoints] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCandidateData() {
      setIsLoading(true);
      try {
        // Fetch candidate profile
        const { data: candidateData } = await supabase
          .from('candidate_profiles')
          .select('id, full_name, email, phone, avatar_url, current_title, current_company, fit_score, skills, years_of_experience, desired_locations')
          .eq('id', candidateId)
          .single();

        if (candidateData) {
          const skillsArray = Array.isArray(candidateData.skills) 
            ? candidateData.skills as string[]
            : [];
          const locationsArray = Array.isArray(candidateData.desired_locations)
            ? candidateData.desired_locations as string[]
            : [];
            
          setCandidate({
            id: candidateData.id,
            full_name: candidateData.full_name || 'Unknown',
            email: candidateData.email || '',
            phone: candidateData.phone || undefined,
            avatar_url: candidateData.avatar_url || undefined,
            current_title: candidateData.current_title || undefined,
            current_company: candidateData.current_company || undefined,
            fit_score: candidateData.fit_score || undefined,
            skills: skillsArray,
            years_of_experience: candidateData.years_of_experience ? Number(candidateData.years_of_experience) : undefined,
            desired_locations: locationsArray,
          });
        }

        // Fetch application if provided
        if (applicationId) {
          const { data: appData } = await supabase
            .from('applications')
            .select('id, status, current_stage_index, created_at, position, company_name')
            .eq('id', applicationId)
            .single();

          if (appData) {
            setApplication({
              id: appData.id,
              status: appData.status || 'unknown',
              current_stage_index: appData.current_stage_index || 0,
              created_at: appData.created_at || '',
              position: appData.position || undefined,
              company_name: appData.company_name || undefined,
            });
          }
        }

        // Fetch previous interview scorecards
        const { data: scorecards } = await supabase
          .from('candidate_scorecards')
          .select('id, overall_rating, recommendation, created_at, stage_index')
          .eq('application_id', applicationId || '')
          .order('created_at', { ascending: false })
          .limit(3);

        if (scorecards) {
          setInterviewScores(scorecards);
        }

        // Generate AI talking points if job is provided
        if (jobId && candidateData) {
          const points = generateTalkingPoints(candidateData);
          setTalkingPoints(points);
        }
      } catch (error) {
        console.error('Failed to load candidate data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadCandidateData();
  }, [candidateId, applicationId, jobId]);

  function generateTalkingPoints(candidateData: any): string[] {
    const points: string[] = [];
    
    if (candidateData.years_of_experience) {
      points.push(`${candidateData.years_of_experience}+ years of experience in the field`);
    }
    if (candidateData.current_company) {
      points.push(`Currently at ${candidateData.current_company} - discuss transition motivation`);
    }
    if (candidateData.skills && Array.isArray(candidateData.skills) && candidateData.skills.length > 0) {
      const topSkills = candidateData.skills.slice(0, 3).join(', ');
      points.push(`Key skills: ${topSkills}`);
    }
    if (candidateData.desired_locations && Array.isArray(candidateData.desired_locations) && candidateData.desired_locations.length > 0) {
      points.push(`Preferred locations: ${candidateData.desired_locations.slice(0, 2).join(', ')}`);
    }
    
    return points;
  }

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (!candidate) {
    return (
      <Card className="w-full">
        <CardContent className="py-6 text-center text-muted-foreground">
          <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Candidate information not available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <User className="h-4 w-4" />
            Candidate Brief
          </CardTitle>
          {compact && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Header with Avatar */}
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={candidate.avatar_url} />
            <AvatarFallback>
              {candidate.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{candidate.full_name}</h3>
            {candidate.current_title && (
              <p className="text-sm text-muted-foreground truncate">
                {candidate.current_title}
              </p>
            )}
          </div>
          {candidate.fit_score && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Star className="h-3 w-3" />
              {Math.round(candidate.fit_score)}%
            </Badge>
          )}
        </div>

        {isExpanded && (
          <>
            {/* Quick Info */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              {candidate.current_company && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Briefcase className="h-3 w-3" />
                  <span className="truncate">{candidate.current_company}</span>
                </div>
              )}
              {candidate.desired_locations && candidate.desired_locations.length > 0 && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{candidate.desired_locations[0]}</span>
                </div>
              )}
            </div>

            {/* Skills */}
            {candidate.skills && candidate.skills.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Key Skills</p>
                <div className="flex flex-wrap gap-1">
                  {candidate.skills.slice(0, 5).map((skill, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                  {candidate.skills.length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{candidate.skills.length - 5}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Application Info */}
            {application && (
              <div className="bg-muted/50 rounded-lg p-2 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium">
                    {application.position || 'Application'}
                  </p>
                  <Badge variant="secondary" className="text-xs">
                    Stage {application.current_stage_index + 1}
                  </Badge>
                </div>
                {application.created_at && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Applied {format(new Date(application.created_at), 'MMM d, yyyy')}
                  </p>
                )}
              </div>
            )}

            {/* AI Talking Points */}
            {talkingPoints.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  AI Talking Points
                </p>
                <ScrollArea className="h-24">
                  <ul className="space-y-1">
                    {talkingPoints.map((point, idx) => (
                      <li key={idx} className="text-xs flex items-start gap-2">
                        <span className="text-primary">•</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </div>
            )}

            {/* Previous Interview Scores */}
            {interviewScores.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  Previous Scores
                </p>
                <div className="space-y-1">
                  {interviewScores.map((score) => (
                    <div
                      key={score.id}
                      className="flex items-center justify-between text-xs bg-muted/30 rounded px-2 py-1"
                    >
                      <span>Stage {(score.stage_index || 0) + 1}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{score.overall_rating || 0}/5</span>
                        <Badge
                          variant={
                            score.recommendation === 'strong_yes' || score.recommendation === 'yes'
                              ? 'default'
                              : score.recommendation === 'no' || score.recommendation === 'strong_no'
                              ? 'destructive'
                              : 'secondary'
                          }
                          className="text-xs"
                        >
                          {score.recommendation || 'pending'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
