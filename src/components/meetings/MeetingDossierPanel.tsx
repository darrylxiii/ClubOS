import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, 
  Briefcase, 
  Building2, 
  MessageSquare, 
  Lightbulb, 
  AlertTriangle,
  RefreshCw,
  Users,
  TrendingUp,
  Calendar,
  Mail,
  MessageCircle,
  Phone,
  ChevronRight,
  Sparkles,
  Eye
} from 'lucide-react';
import { useParticipantDossier, ParticipantDossier, DossierContent } from '@/hooks/useParticipantDossier';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';

interface MeetingDossierPanelProps {
  bookingId?: string;
  meetingId?: string;
  participantEmail: string;
  participantName?: string;
  className?: string;
  compact?: boolean;
}

export function MeetingDossierPanel({
  bookingId,
  meetingId,
  participantEmail,
  participantName,
  className,
  compact = false,
}: MeetingDossierPanelProps) {
  const { 
    dossiers, 
    isLoading, 
    isGenerating, 
    generateDossier, 
    markAsViewed,
    fetchDossiers,
    getDossierForParticipant 
  } = useParticipantDossier({ bookingId, meetingId });

  const [dossier, setDossier] = useState<ParticipantDossier | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDossiers();
  }, [fetchDossiers]);

  useEffect(() => {
    const existingDossier = getDossierForParticipant(participantEmail);
    if (existingDossier) {
      setDossier(existingDossier);
      if (!existingDossier.viewed_at) {
        markAsViewed(existingDossier.id);
      }
    }
  }, [dossiers, participantEmail, getDossierForParticipant, markAsViewed]);

  const handleGenerate = async () => {
    const newDossier = await generateDossier(participantEmail, participantName, true);
    if (newDossier) {
      setDossier(newDossier);
    }
  };

  const content = dossier?.dossier_content as DossierContent | undefined;

  if (isLoading) {
    return <DossierSkeleton compact={compact} />;
  }

  if (!dossier && !isGenerating) {
    return (
      <Card className={cn('border-dashed', className)}>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">Generate Intelligence Brief</h3>
          <p className="text-sm text-muted-foreground text-center mb-4 max-w-sm">
            Get AI-powered insights about {participantName || participantEmail} including 
            background, talking points, and ice breakers.
          </p>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Dossier
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isGenerating) {
    return <DossierSkeleton compact={compact} generating />;
  }

  if (compact) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4" />
              {participantName || participantEmail.split('@')[0]}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={handleGenerate}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{content?.executiveSummary}</p>
          
          {content?.suggestedTopics && content.suggestedTopics.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Talking Points</p>
              <div className="flex flex-wrap gap-1">
                {content.suggestedTopics.slice(0, 3).map((topic, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {topic}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {content?.iceBreakers && content.iceBreakers.length > 0 && (
            <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
              <Lightbulb className="h-4 w-4 text-accent-foreground mt-0.5" />
              <p className="text-xs">{content.iceBreakers[0]}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">
                {participantName || participantEmail.split('@')[0]}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{participantEmail}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {dossier.generated_at && (
              <span className="text-xs text-muted-foreground">
                Generated {formatDistanceToNow(new Date(dossier.generated_at), { addSuffix: true })}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={handleGenerate}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="background">Background</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="prep">Prep</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-4">
            {/* Executive Summary */}
            <div className="p-4 rounded-lg bg-muted/50">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Executive Summary
              </h4>
              <p className="text-sm">{content?.executiveSummary || 'No summary available'}</p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
              <QuickStatCard
                icon={<MessageSquare className="h-4 w-4" />}
                label="Interactions"
                value={content?.previousInteractions?.length || 0}
              />
              <QuickStatCard
                icon={<Users className="h-4 w-4" />}
                label="Mutual Connections"
                value={content?.mutualConnections?.length || 0}
              />
              <QuickStatCard
                icon={<AlertTriangle className="h-4 w-4" />}
                label="Red Flags"
                value={content?.redFlags?.length || 0}
                variant={content?.redFlags?.length ? 'warning' : 'default'}
              />
            </div>

            {/* Personality Insights */}
            {content?.personalityInsights && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Communication Style</h4>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">
                    {content.personalityInsights.communicationStyle}
                  </Badge>
                  <Badge variant="outline">
                    {content.personalityInsights.decisionMakingStyle}
                  </Badge>
                  {content.personalityInsights.preferredMeetingFormat && (
                    <Badge variant="outline">
                      Prefers {content.personalityInsights.preferredMeetingFormat}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="background" className="mt-4 space-y-4">
            {/* LinkedIn Snapshot */}
            {content?.linkedinSnapshot && (
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Professional Background
                </h4>
                {content.linkedinSnapshot.headline && (
                  <p className="text-sm text-muted-foreground">{content.linkedinSnapshot.headline}</p>
                )}
                {content.linkedinSnapshot.experience?.length > 0 && (
                  <div className="space-y-2">
                    {content.linkedinSnapshot.experience.slice(0, 3).map((exp, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">{exp.title}</span>
                        <span className="text-muted-foreground">at {exp.company}</span>
                      </div>
                    ))}
                  </div>
                )}
                {content.linkedinSnapshot.skills?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {content.linkedinSnapshot.skills.slice(0, 8).map((skill, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Company Intel */}
            {content?.companyIntel && (
              <div className="space-y-3 pt-3 border-t">
                <h4 className="font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Company: {content.companyIntel.companyName}
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {content.companyIntel.industry && (
                    <div>
                      <span className="text-muted-foreground">Industry:</span>
                      <p className="font-medium">{content.companyIntel.industry}</p>
                    </div>
                  )}
                  {content.companyIntel.employeeCount && (
                    <div>
                      <span className="text-muted-foreground">Size:</span>
                      <p className="font-medium">{content.companyIntel.employeeCount} employees</p>
                    </div>
                  )}
                  {content.companyIntel.fundingStatus && (
                    <div>
                      <span className="text-muted-foreground">Funding:</span>
                      <p className="font-medium">{content.companyIntel.fundingStatus}</p>
                    </div>
                  )}
                  {content.companyIntel.sentiment && (
                    <div>
                      <span className="text-muted-foreground">Sentiment:</span>
                      <Badge variant={content.companyIntel.sentiment === 'positive' ? 'default' : 'secondary'}>
                        {content.companyIntel.sentiment}
                      </Badge>
                    </div>
                  )}
                </div>
                {content.companyIntel.recentNews?.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-sm text-muted-foreground">Recent News:</span>
                    {content.companyIntel.recentNews.slice(0, 3).map((news, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <TrendingUp className="h-3 w-3 text-muted-foreground mt-1" />
                        <span>{news}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Mutual Connections */}
            {content?.mutualConnections && content.mutualConnections.length > 0 && (
              <div className="space-y-2 pt-3 border-t">
                <h4 className="font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Mutual Connections
                </h4>
                <div className="flex flex-wrap gap-2">
                  {content.mutualConnections.map((connection, i) => (
                    <Badge key={i} variant="outline">
                      {connection}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <ScrollArea className="h-[300px]">
              {content?.previousInteractions && content.previousInteractions.length > 0 ? (
                <div className="space-y-3">
                  {content.previousInteractions.map((interaction, i) => (
                    <InteractionItem key={i} interaction={interaction} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageSquare className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No previous interactions found</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    This appears to be a first-time contact
                  </p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="prep" className="mt-4 space-y-4">
            {/* Suggested Topics */}
            {content?.suggestedTopics && content.suggestedTopics.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-accent-foreground" />
                  Suggested Talking Points
                </h4>
                <ul className="space-y-2">
                  {content.suggestedTopics.map((topic, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <ChevronRight className="h-4 w-4 text-primary mt-0.5" />
                      {topic}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Ice Breakers */}
            {content?.iceBreakers && content.iceBreakers.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-primary" />
                  Ice Breakers
                </h4>
                <ul className="space-y-2">
                  {content.iceBreakers.map((breaker, i) => (
                    <li key={i} className="p-2 rounded-lg bg-primary/10 text-sm">
                      "{breaker}"
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Things to Avoid */}
            {content?.thingsToAvoid && content.thingsToAvoid.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2 text-accent-foreground">
                  <AlertTriangle className="h-4 w-4" />
                  Things to Avoid
                </h4>
                <ul className="space-y-1.5">
                  {content.thingsToAvoid.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-1">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Red Flags */}
            {content?.redFlags && content.redFlags.length > 0 && (
              <div className="space-y-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <h4 className="font-medium flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  Red Flags
                </h4>
                <ul className="space-y-1.5">
                  {content.redFlags.map((flag, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-destructive">
                      <span className="mt-1">•</span>
                      {flag}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function QuickStatCard({ 
  icon, 
  label, 
  value, 
  variant = 'default' 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: number;
  variant?: 'default' | 'warning';
}) {
  return (
    <div className={cn(
      'p-3 rounded-lg text-center',
      variant === 'warning' && value > 0 ? 'bg-accent/50' : 'bg-muted/50'
    )}>
      <div className={cn(
        'flex justify-center mb-1',
        variant === 'warning' && value > 0 ? 'text-accent-foreground' : 'text-muted-foreground'
      )}>
        {icon}
      </div>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function InteractionItem({ interaction }: { interaction: { type: string; date: string; summary: string } }) {
  const getIcon = () => {
    switch (interaction.type) {
      case 'meeting': return <Calendar className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'whatsapp': return <MessageCircle className="h-4 w-4" />;
      case 'call': return <Phone className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getColor = () => {
    switch (interaction.type) {
      case 'meeting': return 'bg-primary/10 text-primary';
      case 'email': return 'bg-secondary/50 text-secondary-foreground';
      case 'whatsapp': return 'bg-accent/50 text-accent-foreground';
      case 'call': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className={cn('p-2 rounded-lg', getColor())}>
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline" className="capitalize text-xs">
            {interaction.type}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {format(new Date(interaction.date), 'MMM d, yyyy')}
          </span>
        </div>
        <p className="text-sm mt-1 line-clamp-2">{interaction.summary}</p>
      </div>
    </div>
  );
}

function DossierSkeleton({ compact = false, generating = false }: { compact?: boolean; generating?: boolean }) {
  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            {generating && <RefreshCw className="h-4 w-4 animate-spin text-primary" />}
            <Skeleton className="h-5 w-32" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-6 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-60" />
          </div>
        </div>
        {generating && (
          <div className="flex items-center gap-2 mt-3 text-sm text-primary">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Generating intelligence brief...
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      </CardContent>
    </Card>
  );
}
