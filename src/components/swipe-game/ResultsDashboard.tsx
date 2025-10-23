import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Share2, Mail, Briefcase, TrendingUp, TrendingDown } from 'lucide-react';
import { SwipeResult } from '@/types/assessment';
import { toast } from 'sonner';

interface ResultsDashboardProps {
  result: SwipeResult;
}

export const ResultsDashboard = memo(({ result }: ResultsDashboardProps) => {
  const navigate = useNavigate();

  const handleDownload = () => {
    toast.success('Results downloaded!');
  };

  const handleShare = () => {
    toast.success('Share link copied to clipboard!');
  };

  const handleEmail = () => {
    toast.success('Results sent to your email!');
  };

  const topTraits = Object.entries(result.traits)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-background to-background/80">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Hero Card */}
        <Card>
          <CardHeader className="text-center pb-4">
            <div className="text-6xl mb-4">🎯</div>
            <CardTitle className="text-3xl">Your Personality Profile</CardTitle>
            <CardDescription className="text-lg">
              Based on your responses to 50 scenarios
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Archetype Badge */}
            <div className="flex justify-center">
              <Badge className="text-lg px-6 py-2">
                {result.archetype}
              </Badge>
            </div>

            {/* Score */}
            <div className="text-center">
              <div className="text-5xl font-bold text-primary mb-2">
                {result.score}
              </div>
              <p className="text-muted-foreground">Overall Fit Score</p>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Button variant="outline" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button variant="outline" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" onClick={handleEmail}>
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Traits Radar/Spider Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Your Top Traits</CardTitle>
            <CardDescription>Your strongest characteristics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topTraits.map(([trait, value]) => (
                <div key={trait} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="capitalize font-medium">{trait}</span>
                    <span className="text-sm text-muted-foreground">{value}/10</span>
                  </div>
                  <div className="h-2 bg-card/40 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${(value / 10) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Strengths & Growth Areas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Top Strengths
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {result.topStrengths.map((strength, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-green-500 mt-1">✓</span>
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-orange-500" />
                Growth Areas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {result.growthAreas.map((area, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-orange-500 mt-1">→</span>
                    <span>{area}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Recommended Jobs */}
        <Card>
          <CardHeader>
            <CardTitle>Recommended Roles</CardTitle>
            <CardDescription>Jobs that match your personality</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {result.recommendedJobs.map((job, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 rounded-lg border border-border/20 bg-card/30 backdrop-blur-sm hover:bg-card/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{job.title}</span>
                  </div>
                  <Badge variant="outline">{job.match}% Match</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={() => navigate('/jobs')}
            className="gap-2"
          >
            <Briefcase className="h-5 w-5" />
            View Matching Jobs
          </Button>
        </div>
      </div>
    </div>
  );
});

ResultsDashboard.displayName = 'ResultsDashboard';
