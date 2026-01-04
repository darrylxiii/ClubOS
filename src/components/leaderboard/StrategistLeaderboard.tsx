import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  DollarSign,
  Target,
  Clock,
  Star,
  Crown,
  Medal,
  Award,
  Loader2,
} from 'lucide-react';
import { useStrategistLeaderboard, StrategistRanking } from '@/hooks/useStrategistLeaderboard';
import { formatCurrencyCompact } from '@/hooks/useMultiHirePipelineMetrics';

export function StrategistLeaderboard() {
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'quarterly'>('monthly');
  const { data: rankings, isLoading } = useStrategistLeaderboard(period);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="w-5 text-center font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const topPerformer = rankings?.[0];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Performer Highlight */}
      {topPerformer && (
        <Card className="bg-gradient-to-br from-yellow-500/10 to-amber-500/5 border-yellow-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="h-20 w-20 border-4 border-yellow-500/30">
                  <AvatarImage src={topPerformer.avatar_url || undefined} />
                  <AvatarFallback className="text-2xl">
                    {topPerformer.strategist_name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -top-2 -right-2 p-1 rounded-full bg-yellow-500 text-yellow-950">
                  <Crown className="h-4 w-4" />
                </div>
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">
                    <Trophy className="h-3 w-3 mr-1" />
                    Top Performer
                  </Badge>
                </div>
                <h3 className="text-2xl font-bold">{topPerformer.strategist_name}</h3>
                <p className="text-muted-foreground">
                  {topPerformer.placements_count} placements • {formatCurrencyCompact(topPerformer.revenue_generated)} revenue
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-3 rounded-lg bg-background/50">
                  <p className="text-2xl font-bold text-primary">{topPerformer.ranking_score.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">Score</p>
                </div>
                <div className="p-3 rounded-lg bg-background/50">
                  <p className="text-2xl font-bold">{topPerformer.conversion_rate.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">Conversion</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Strategist Leaderboard
              </CardTitle>
              <CardDescription>
                Performance rankings based on revenue, placements, and efficiency
              </CardDescription>
            </div>
            
            <Tabs value={period} onValueChange={(v: any) => setPeriod(v)}>
              <TabsList>
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                <TabsTrigger value="quarterly">Quarterly</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {!rankings?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4" />
              <p>No performance data available</p>
              <p className="text-sm">Rankings will appear as strategists make placements</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rankings.map((strategist) => (
                <div
                  key={strategist.id}
                  className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                    strategist.rank_position <= 3
                      ? 'bg-primary/5 border-primary/20'
                      : 'bg-card hover:bg-muted/50'
                  }`}
                >
                  {/* Rank */}
                  <div className="w-8 flex justify-center">
                    {getRankIcon(strategist.rank_position)}
                  </div>

                  {/* Avatar */}
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={strategist.avatar_url || undefined} />
                    <AvatarFallback>
                      {strategist.strategist_name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium truncate">{strategist.strategist_name}</h4>
                      {getTrendIcon(strategist.trend)}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {strategist.placements_count} placements
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {formatCurrencyCompact(strategist.revenue_generated)}
                      </span>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="hidden md:flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <p className="font-medium">{strategist.conversion_rate.toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground">Conversion</p>
                    </div>
                    <div className="text-center">
                      <p className="font-medium">{strategist.deals_closed}</p>
                      <p className="text-xs text-muted-foreground">Deals</p>
                    </div>
                    <div className="text-center">
                      <p className="font-medium">{strategist.applications_sourced}</p>
                      <p className="text-xs text-muted-foreground">Sourced</p>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="w-20 text-right">
                    <p className="text-lg font-bold text-primary">
                      {strategist.ranking_score.toFixed(1)}
                    </p>
                    <p className="text-xs text-muted-foreground">Score</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scoring Methodology */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Scoring Methodology</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <span>Revenue 30%</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span>Placements 25%</span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <span>Conversion 20%</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span>Speed 15%</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-primary" />
              <span>NPS 10%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
