import { memo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, 
  FileText, 
  Video, 
  MessageSquare, 
  Calendar,
  TrendingUp,
  Brain,
  Clock,
  Mail,
  Phone,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CandidateCommandCenterProps {
  candidate: any;
  application?: any;
  assessments?: any[];
  meetings?: any[];
  onAction?: (action: string, data?: any) => void;
  className?: string;
}

export const CandidateCommandCenter = memo(({
  candidate,
  application,
  assessments = [],
  meetings = [],
  onAction,
  className,
}: CandidateCommandCenterProps) => {
  const [activeTab, setActiveTab] = useState('overview');

  // Calculate quick stats
  const avgAssessmentScore = assessments.length > 0
    ? Math.round(assessments.reduce((sum, a) => sum + (a.score || 0), 0) / assessments.length)
    : null;

  const completedMeetings = meetings.filter(m => m.status === 'completed').length;
  const upcomingMeetings = meetings.filter(m => 
    m.status === 'scheduled' && new Date(m.scheduled_start) > new Date()
  ).length;

  // Generate AI summary
  const generateAISummary = () => {
    const strengths = [];
    const concerns = [];
    
    if (avgAssessmentScore && avgAssessmentScore >= 75) {
      strengths.push('Strong assessment performance');
    }
    if (completedMeetings >= 2) {
      strengths.push('Multiple successful interviews');
    }
    if (candidate.years_of_experience >= 5) {
      strengths.push('Experienced professional');
    }
    if (candidate.notice_period === 'immediately' || candidate.notice_period === '2_weeks') {
      strengths.push('Quick availability');
    }

    if (avgAssessmentScore && avgAssessmentScore < 50) {
      concerns.push('Below average assessment scores');
    }
    if (completedMeetings === 0 && meetings.length > 0) {
      concerns.push('No completed interviews yet');
    }

    return { strengths, concerns };
  };

  const { strengths, concerns } = generateAISummary();

  return (
    <Card className={cn('border-primary/20', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Command Center
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            <Sparkles className="h-3 w-3 mr-1" />
            AI-Powered
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="assessments" className="text-xs">Assessments</TabsTrigger>
            <TabsTrigger value="interviews" className="text-xs">Interviews</TabsTrigger>
            <TabsTrigger value="actions" className="text-xs">Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {avgAssessmentScore || '-'}
                </div>
                <div className="text-xs text-muted-foreground">Avg Score</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">{completedMeetings}</div>
                <div className="text-xs text-muted-foreground">Interviews</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">{assessments.length}</div>
                <div className="text-xs text-muted-foreground">Assessments</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">{upcomingMeetings}</div>
                <div className="text-xs text-muted-foreground">Upcoming</div>
              </div>
            </div>

            {/* AI Summary */}
            <div className="space-y-3">
              {strengths.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Strengths
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {strengths.map((s, i) => (
                      <Badge key={i} variant="secondary" className="text-xs bg-green-500/10 text-green-700">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {concerns.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-amber-600">
                    <XCircle className="h-4 w-4" />
                    Areas to Explore
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {concerns.map((c, i) => (
                      <Badge key={i} variant="secondary" className="text-xs bg-amber-500/10 text-amber-700">
                        {c}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Contact Info */}
            <div className="flex gap-2 pt-2 border-t">
              {candidate.email && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => onAction?.('email', { email: candidate.email })}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Button>
              )}
              {candidate.phone && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => onAction?.('call', { phone: candidate.phone })}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Call
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={() => onAction?.('message')}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Message
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="assessments" className="mt-4">
            {assessments.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No assessments completed yet</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3"
                  onClick={() => onAction?.('assign_assessment')}
                >
                  Assign Assessment
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {assessments.slice(0, 5).map((assessment, i) => (
                  <div 
                    key={i} 
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-sm">{assessment.assessment_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {assessment.assessment_type}
                      </div>
                    </div>
                    <Badge 
                      variant={assessment.score >= 75 ? 'default' : assessment.score >= 50 ? 'secondary' : 'destructive'}
                    >
                      {assessment.score || 0}%
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="interviews" className="mt-4">
            {meetings.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Video className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No interviews scheduled</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3"
                  onClick={() => onAction?.('schedule_interview')}
                >
                  Schedule Interview
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {meetings.slice(0, 5).map((meeting, i) => (
                  <div 
                    key={i} 
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Video className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-sm">{meeting.title || 'Interview'}</div>
                        <div className="text-xs text-muted-foreground">
                          {meeting.scheduled_start 
                            ? new Date(meeting.scheduled_start).toLocaleDateString()
                            : 'Not scheduled'}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs capitalize">
                      {meeting.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="actions" className="mt-4">
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                className="h-auto py-3 flex-col"
                onClick={() => onAction?.('schedule_interview')}
              >
                <Calendar className="h-5 w-5 mb-1" />
                <span className="text-xs">Schedule</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-3 flex-col"
                onClick={() => onAction?.('assign_assessment')}
              >
                <FileText className="h-5 w-5 mb-1" />
                <span className="text-xs">Assign Test</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-3 flex-col"
                onClick={() => onAction?.('advance_stage')}
              >
                <ArrowRight className="h-5 w-5 mb-1" />
                <span className="text-xs">Advance</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-3 flex-col"
                onClick={() => onAction?.('view_salary_insights')}
              >
                <TrendingUp className="h-5 w-5 mb-1" />
                <span className="text-xs">Salary Insights</span>
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
});

CandidateCommandCenter.displayName = 'CandidateCommandCenter';
