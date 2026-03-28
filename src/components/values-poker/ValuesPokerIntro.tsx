import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Coins, Scale, Target } from 'lucide-react';

interface ValuesPokerIntroProps {
  onStart: () => void;
}

export const ValuesPokerIntro = memo(({ onStart }: ValuesPokerIntroProps) => {
  const { t } = useTranslation('common');
  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <Card>
        <CardHeader>
          <div className="text-6xl mb-4 text-center">🎲</div>
          <CardTitle className="text-3xl text-center">{t('valuesPoker.valuesPoker')}</CardTitle>
          <p className="text-center text-muted-foreground mt-2">{t('valuesPoker.discoverWhatTrulyMotivatesYouAtWork')}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Coins className="h-4 w-4" />
            <AlertDescription>{t('valuesPoker.allocate100PointsAcrossWorkValuesThenMak')}</AlertDescription>
          </Alert>

          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Scale className="h-5 w-5" />
              {t('valuesPoker.howItWorks', 'How It Works')}
            </h3>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">1</span>
                <p><strong>{t('valuesPoker.allocatePoints', 'Allocate Points')}:</strong>{t('valuesPoker.allocatePointsDesc', 'Distribute 100 points across 10 work values')}</p>
              </div>
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">2</span>
                <p><strong>{t('valuesPoker.makeTradeoffs', 'Make Trade-offs')}:</strong>{t('valuesPoker.makeTradeoffsDesc', 'Choose between 20 realistic job scenarios')}</p>
              </div>
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">3</span>
                <p><strong>{t('valuesPoker.revealTruth', 'Reveal Truth')}:</strong>{t('valuesPoker.revealTruthDesc', 'See if your actions match your words')}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Target className="h-5 w-5" />
              {t('valuesPoker.whatYoullDiscover', "What You'll Discover")}
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-lg bg-muted">
                <div className="font-medium">{t('valuesPoker.yourArchetype', 'Your Archetype')}</div>
                <div className="text-xs text-muted-foreground">{t('valuesPoker.coreMotivation', 'Core motivation profile')}</div>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <div className="font-medium">{t('valuesPoker.consistency', 'Consistency')}</div>
                <div className="text-xs text-muted-foreground">{t('valuesPoker.walkYourTalk', 'Do you walk your talk?')}</div>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <div className="font-medium">{t('valuesPoker.cultureFit', 'Culture Fit')}</div>
                <div className="text-xs text-muted-foreground">{t('valuesPoker.whichCompaniesMatch', 'Which companies match')}</div>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <div className="font-medium">{t('valuesPoker.tradeOffPatterns', 'Trade-off Patterns')}</div>
                <div className="text-xs text-muted-foreground">{t('valuesPoker.whatYoullSacrifice', "What you'll sacrifice")}</div>
              </div>
            </div>
          </div>

          <Button onClick={onStart} className="w-full" size="lg">{t('valuesPoker.startAssessment')}</Button>
        </CardContent>
      </Card>
    </div>
  );
});

ValuesPokerIntro.displayName = 'ValuesPokerIntro';
