import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle2, Clock, Flame, Target, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface Challenge {
  id: string;
  name: string;
  description: string | null;
  challenge_type: string;
  criteria: any;
  bonus_points: number | null;
  start_date: string | null;
  end_date: string | null;
}

interface ChallengeProgress {
  challenge_id: string;
  current_progress: number | null;
  target_value: number;
  completed_at: string | null;
}

export const DailyChallenges = () => {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [progress, setProgress] = useState<Map<string, ChallengeProgress>>(new Map());
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (user?.id) {
      fetchChallenges();
      fetchStreak();
    }
  }, [user?.id]);

  const fetchChallenges = async () => {
    try {
      // Fetch active daily and weekly challenges
      const { data: challengesData } = await supabase
        .from('achievement_challenges')
        .select('*')
        .eq('is_active', true)
        .in('challenge_type', ['daily', 'weekly'])
        .gte('end_date', new Date().toISOString().split('T')[0])
        .order('challenge_type', { ascending: true });

      if (challengesData) {
        setChallenges(challengesData as any);

        // Fetch user's progress for these challenges
        const { data: progressData } = await supabase
          .from('user_challenge_progress')
          .select('*')
          .eq('user_id', user?.id ?? '')
          .in(
            'challenge_id',
            challengesData.map((c) => c.id)
          );

        const progressMap = new Map<string, ChallengeProgress>();
        (progressData || []).forEach((p: any) => {
          if (!p.challenge_id) return;
          progressMap.set(p.challenge_id, p as ChallengeProgress);
        });

        setProgress(progressMap);
      }
    } catch (error) {
      console.error('Error fetching challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStreak = async () => {
    // Calculate daily challenge completion streak
    const { data: completedChallenges } = await supabase
      .from('user_challenge_progress')
      .select('completed_at')
      .eq('user_id', user?.id ?? '')
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(30);

    if (completedChallenges && completedChallenges.length > 0) {
      let streakCount = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const challenge of completedChallenges) {
        const completedDate = new Date(challenge.completed_at!);
        completedDate.setHours(0, 0, 0, 0);

        const daysDiff = Math.floor(
          (today.getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysDiff === streakCount) {
          streakCount++;
        } else {
          break;
        }
      }

      setStreak(streakCount);
    }
  };

  const handleChallengeAction = (challenge: Challenge) => {
    // Navigate to relevant page based on criteria type
    const criteriaType = challenge.criteria.type;
    const routes: Record<string, string> = {
      applications: '/candidate/jobs',
      courses: '/academy',
      messages_sent: '/messages',
      profile_completion: '/candidate/profile',
      jobs_saved: '/candidate/jobs',
    };

    const route = routes[criteriaType];
    if (route) {
      window.location.href = route;
    } else {
      toast.info('Complete the challenge to earn bonus XP!');
    }
  };

  const getChallengeIcon = (type: string) => {
    if (type === 'daily') return <Target className="h-5 w-5" />;
    if (type === 'weekly') return <Flame className="h-5 w-5" />;
    return <Zap className="h-5 w-5" />;
  };

  const renderChallenge = (challenge: Challenge) => {
    const prog = progress.get(challenge.id);
    const currentProgress = prog?.current_progress ?? 0;
    const progressPercentage = prog
      ? Math.min((currentProgress / prog.target_value) * 100, 100)
      : 0;
    const isCompleted = !!prog?.completed_at;
    const remaining = prog ? prog.target_value - currentProgress : challenge.criteria.count || 1;

    return (
      <Card
        key={challenge.id}
        className={`
          p-4 transition-all duration-300
          ${isCompleted ? 'bg-primary/5 border-primary/30' : 'hover:border-primary/30'}
        `}
      >
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`
                  p-2 rounded-lg 
                  ${isCompleted ? 'bg-primary/20 text-primary' : 'bg-muted/50'}
                `}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  getChallengeIcon(challenge.challenge_type)
                )}
              </div>
              <div>
                <h4 className="font-semibold">{challenge.name}</h4>
                <p className="text-sm text-muted-foreground">{challenge.description}</p>
              </div>
            </div>
            <Badge variant={challenge.challenge_type === 'daily' ? 'default' : 'secondary'}>
              {challenge.challenge_type}
            </Badge>
          </div>

          {/* Progress */}
          {!isCompleted && (
            <>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-semibold">
                    {prog?.current_progress || 0} / {prog?.target_value || challenge.criteria.count || 1}
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {remaining} more action{remaining !== 1 ? 's' : ''} needed
                </span>
                <Badge variant="outline" className="gap-1">
                  <Zap className="h-3 w-3" />
                  +{challenge.bonus_points} XP
                </Badge>
              </div>

              <Button
                onClick={() => handleChallengeAction(challenge)}
                variant="outline"
                size="sm"
                className="w-full"
              >
                Start Challenge
              </Button>
            </>
          )}

          {/* Completed */}
          {isCompleted && (
            <div className="flex items-center justify-center gap-2 text-sm font-semibold text-primary">
              <CheckCircle2 className="h-4 w-4" />
              <span>Challenge Completed!</span>
              <Badge variant="secondary" className="gap-1">
                <Zap className="h-3 w-3" />
                +{challenge.bonus_points} XP
              </Badge>
            </div>
          )}
        </div>
      </Card>
    );
  };

  if (loading) {
    return (
      <Card className="p-8 text-center">
        <Clock className="h-8 w-8 mx-auto mb-4 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading challenges...</p>
      </Card>
    );
  }

  const dailyChallenges = challenges.filter((c) => c.challenge_type === 'daily');
  const weeklyChallenges = challenges.filter((c) => c.challenge_type === 'weekly');
  const completedToday = Array.from(progress.values()).filter(
    (p) =>
      p.completed_at &&
      new Date(p.completed_at).toDateString() === new Date().toDateString()
  ).length;

  return (
    <div className="space-y-6">
      {/* Streak Card */}
      {streak > 0 && (
        <Card className="glass p-6 border-primary/30 bg-gradient-to-br from-primary/10 to-accent/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/20">
                <Flame className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">{streak} Day Streak!</h3>
                <p className="text-sm text-muted-foreground">
                  Keep it going! Complete today's challenges
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              {completedToday}/{dailyChallenges.length} today
            </Badge>
          </div>
        </Card>
      )}

      {/* Daily Challenges */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Daily Challenges</h3>
          </div>
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            Resets in {24 - new Date().getHours()}h
          </Badge>
        </div>
        <div className="grid gap-4">
          {dailyChallenges.map(renderChallenge)}
          {dailyChallenges.length === 0 && (
            <Card className="p-8 text-center">
              <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No daily challenges available</p>
            </Card>
          )}
        </div>
      </div>

      {/* Weekly Challenges */}
      {weeklyChallenges.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Weekly Challenges</h3>
          </div>
          <div className="grid gap-4">
            {weeklyChallenges.map(renderChallenge)}
          </div>
        </div>
      )}
    </div>
  );
};
