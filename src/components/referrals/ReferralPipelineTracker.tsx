import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Briefcase, TrendingUp, Euro, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ReferralWithPipeline {
  id: string;
  friendName: string | null;
  friendEmail: string | null;
  jobTitle: string | null;
  companyName: string | null;
  currentStage: string;
  currentStageIndex: number;
  totalStages: number;
  status: 'pending' | 'active' | 'completed' | 'rejected';
  appliedAt: string;
  estimatedSalary?: number;
  potentialReward: number;
  inviteCode: string;
  referredDate: string;
  lastActivity?: string;
}

const calculateReferralBonus = (salary: number = 75000): number => {
  if (salary < 50000) return 1000;
  if (salary < 75000) return 1500;
  if (salary < 125000) return 2000;
  return 3000;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return 'text-success';
    case 'active': return 'text-warning';
    case 'rejected': return 'text-destructive';
    default: return 'text-muted-foreground';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed': return CheckCircle2;
    case 'active': return Clock;
    case 'rejected': return AlertCircle;
    default: return Clock;
  }
};

export const ReferralPipelineTracker = () => {
  const { user } = useAuth();
  const [referrals, setReferrals] = useState<ReferralWithPipeline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchReferralPipelines = async () => {
      try {
        // Get all invite codes created by this user
        const { data: inviteCodes, error: inviteError } = await supabase
          .from('invite_codes')
          .select(`
            id,
            code,
            created_at,
            referral_metadata (
              friend_name,
              friend_email,
              job_title,
              company_name
            ),
            referral_network (
              user_id,
              joined_at
            )
          `)
          .eq('created_by', user.id)
          .order('created_at', { ascending: false });

        if (inviteError) throw inviteError;

        const pipelineData: ReferralWithPipeline[] = [];

        // For each referral that has joined, get their application data
        for (const invite of inviteCodes || []) {
          const metadata = invite.referral_metadata?.[0];
          const networkEntry = invite.referral_network?.[0];

          if (networkEntry?.user_id && metadata) {
            // Get applications for this referred user
            const { data: applications } = await supabase
              .from('applications')
              .select('*')
              .eq('user_id', networkEntry.user_id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            if (applications) {
              const stages = applications.stages as any[];
              const currentStageIndex = applications.current_stage_index;
              const currentStage = stages[currentStageIndex];
              const estimatedSalary = 75000; // Default estimate

              let status: 'pending' | 'active' | 'completed' | 'rejected' = 'active';
              if (applications.status === 'rejected') status = 'rejected';
              else if (applications.status === 'hired') status = 'completed';
              else if (currentStageIndex === 0) status = 'pending';

              pipelineData.push({
                id: applications.id,
                friendName: metadata.friend_name,
                friendEmail: metadata.friend_email,
                jobTitle: metadata.job_title,
                companyName: metadata.company_name,
                currentStage: currentStage?.name || 'Application Submitted',
                currentStageIndex,
                totalStages: stages.length,
                status,
                appliedAt: applications.applied_at,
                estimatedSalary,
                potentialReward: calculateReferralBonus(estimatedSalary),
                inviteCode: invite.code,
                referredDate: invite.created_at,
                lastActivity: applications.updated_at,
              });
            } else {
              // User joined but hasn't applied yet
              pipelineData.push({
                id: invite.id,
                friendName: metadata.friend_name,
                friendEmail: metadata.friend_email,
                jobTitle: metadata.job_title,
                companyName: metadata.company_name,
                currentStage: 'Joined Platform',
                currentStageIndex: 0,
                totalStages: 5,
                status: 'pending',
                appliedAt: networkEntry.joined_at,
                estimatedSalary: 75000,
                potentialReward: calculateReferralBonus(75000),
                inviteCode: invite.code,
                referredDate: invite.created_at,
              });
            }
          } else if (metadata) {
            // Invite sent but not yet used
            pipelineData.push({
              id: invite.id,
              friendName: metadata.friend_name,
              friendEmail: metadata.friend_email,
              jobTitle: metadata.job_title,
              companyName: metadata.company_name,
              currentStage: 'Invite Sent',
              currentStageIndex: 0,
              totalStages: 5,
              status: 'pending',
              appliedAt: invite.created_at,
              estimatedSalary: 75000,
              potentialReward: calculateReferralBonus(75000),
              inviteCode: invite.code,
              referredDate: invite.created_at,
            });
          }
        }

        setReferrals(pipelineData);
      } catch (error) {
        console.error('Error fetching referral pipelines:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReferralPipelines();

    // Set up real-time subscription for application updates
    const channel = supabase
      .channel('referral-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'applications',
        },
        () => {
          fetchReferralPipelines();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="py-12 text-center">
          <div className="animate-pulse text-muted-foreground">Loading referral pipelines...</div>
        </CardContent>
      </Card>
    );
  }

  if (referrals.length === 0) {
    return (
      <Card className="glass-card">
        <CardContent className="py-12 text-center">
          <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No Active Referrals</h3>
          <p className="text-muted-foreground mb-4">
            Start referring friends to track their journey and earn rewards
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {referrals.map((referral) => {
        const progressPercentage = ((referral.currentStageIndex + 1) / referral.totalStages) * 100;
        const StatusIcon = getStatusIcon(referral.status);

        return (
          <Card key={referral.id} className="glass-card hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-xl">{referral.friendName}</CardTitle>
                    <Badge 
                      variant="outline" 
                      className={getStatusColor(referral.status)}
                    >
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {referral.status === 'completed' ? 'Hired' : 
                       referral.status === 'rejected' ? 'Not Selected' :
                       referral.status === 'active' ? 'In Progress' : 'Pending'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Briefcase className="w-4 h-4" />
                    {referral.jobTitle} at {referral.companyName}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    Referred {formatDistanceToNow(new Date(referral.referredDate), { addSuffix: true })}
                  </div>
                </div>

                <div className="text-right space-y-2">
                  <div className="flex items-center gap-2 justify-end">
                    <Euro className="w-5 h-5 text-success" />
                    <div>
                      <div className="text-2xl font-bold text-success">
                        €{referral.potentialReward.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {referral.status === 'completed' ? 'Earned' : 'Potential'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Pipeline Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{referral.currentStage}</span>
                  <span className="text-muted-foreground">
                    Stage {referral.currentStageIndex + 1} of {referral.totalStages}
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>

              {/* Additional Details */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/50">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Status</div>
                  <div className="text-sm font-medium capitalize">{referral.status}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Invite Code</div>
                  <div className="text-sm font-mono">{referral.inviteCode}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Last Activity</div>
                  <div className="text-sm">
                    {referral.lastActivity 
                      ? formatDistanceToNow(new Date(referral.lastActivity), { addSuffix: true })
                      : 'No activity yet'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
