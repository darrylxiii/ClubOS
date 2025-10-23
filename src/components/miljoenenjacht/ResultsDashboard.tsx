import { memo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { PsychologicalProfile, GameOutcome, JobMatch } from '@/types/miljoenenjacht';
import { formatCurrency } from '@/lib/miljoenenjacht/utils';
import { Download, Share2, Trophy, TrendingUp, Brain, Target } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface ResultsDashboardProps {
  profile: PsychologicalProfile;
  outcome: GameOutcome;
  jobMatches: JobMatch[];
}

export const ResultsDashboard = memo(({ profile, outcome, jobMatches }: ResultsDashboardProps) => {
  const navigate = useNavigate();

  const handleDownload = () => {
    toast({ title: 'Downloading Results', description: 'Your report is being prepared' });
  };

  const handleShare = () => {
    toast({ title: 'Share Link Copied', description: 'Results link copied to clipboard' });
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-background via-background/95 to-primary/5">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <Trophy className="w-20 h-20 mx-auto text-primary" />
          <h1 className="text-4xl md:text-5xl font-bold">Your Results</h1>
          <p className="text-xl text-muted-foreground">
            Complete psychological profile and career matches
          </p>
        </motion.div>

        {/* Outcome Summary */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="p-6 md:p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Final Winnings</div>
                  <div className="text-3xl md:text-4xl font-bold text-primary">
                    {formatCurrency(outcome.finalWinnings)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Your Case Contained</div>
                  <div className="text-3xl md:text-4xl font-bold">
                    {formatCurrency(outcome.initialCaseContained)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Decision</div>
                  <div className="text-3xl md:text-4xl font-bold">
                    {outcome.tookDeal ? '💰 DEAL' : '🎲 NO DEAL'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Archetype */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-6 h-6" />
                Your Archetype: {profile.archetype}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Based on your decisions, you exhibit a {profile.decisionMakingStyle} decision-making style.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Psychological Traits */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-6 h-6" />
                Psychological Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: 'Risk Tolerance', value: profile.riskTolerance },
                { label: 'Decision Quality', value: profile.decisionQuality },
                { label: 'Emotional Regulation', value: profile.emotionalRegulation },
                { label: 'Pressure Performance', value: profile.pressurePerformance },
                { label: 'Analytical Thinking', value: profile.analyticalThinking },
                { label: 'Strategic Planning', value: profile.strategicPlanning },
                { label: 'Regret Management', value: profile.regretManagement }
              ].map((trait, i) => (
                <motion.div
                  key={trait.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  className="space-y-2"
                >
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{trait.label}</span>
                    <span className="text-muted-foreground">{trait.value}/100</span>
                  </div>
                  <Progress value={trait.value} className="h-2" />
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Cognitive Biases */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Cognitive Biases Detected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(profile.cognitiveBiases).map(([key, bias]) => (
                  <div
                    key={key}
                    className={`p-4 rounded-lg border ${
                      bias.present
                        ? 'bg-yellow-500/10 border-yellow-500/30'
                        : 'bg-green-500/10 border-green-500/30'
                    }`}
                  >
                    <div className="font-semibold mb-1">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {bias.present ? `${bias.severity} severity` : 'Not detected'}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Job Matches */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-6 h-6" />
                Top Career Matches
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {jobMatches.map((job, i) => (
                <motion.div
                  key={job.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="p-4 rounded-lg bg-card/50 border border-border/50"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-semibold text-lg">{job.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {job.matchScore}% match
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-primary">
                      #{i + 1}
                    </div>
                  </div>
                  <Progress value={job.matchScore} className="h-2 mb-3" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div>
                      <div className="font-medium text-green-500 mb-1">Strengths</div>
                      <ul className="space-y-1">
                        {job.strengths.map((s, idx) => (
                          <li key={idx} className="text-muted-foreground">• {s}</li>
                        ))}
                      </ul>
                    </div>
                    {job.concerns.length > 0 && (
                      <div>
                        <div className="font-medium text-yellow-500 mb-1">Consider</div>
                        <ul className="space-y-1">
                          {job.concerns.map((c, idx) => (
                            <li key={idx} className="text-muted-foreground">• {c}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-wrap gap-4 justify-center"
        >
          <Button variant="outline" onClick={handleDownload} className="gap-2">
            <Download className="w-4 h-4" />
            Download Report
          </Button>
          <Button variant="outline" onClick={handleShare} className="gap-2">
            <Share2 className="w-4 h-4" />
            Share Results
          </Button>
          <Button onClick={() => navigate('/jobs')} className="gap-2">
            <Target className="w-4 h-4" />
            View Matching Jobs
          </Button>
        </motion.div>
      </div>
    </div>
  );
});

ResultsDashboard.displayName = 'ResultsDashboard';
