import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, Lightbulb, TrendingUp } from 'lucide-react';

interface BlindSpotIntroProps {
  onStart: () => void;
}

export const BlindSpotIntro = memo(({ onStart }: BlindSpotIntroProps) => {
  const { t } = useTranslation('common');
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      <Card>
        <CardHeader>
          <div className="text-6xl mb-4 text-center">🔍</div>
          <CardTitle className="text-3xl text-center">{t('blindSpot.blindSpotDetector')}</CardTitle>
          <p className="text-center text-muted-foreground mt-2">{t('blindSpot.discoverTheGapBetweenSelfperceptionAndRe')}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Eye className="h-4 w-4" />
            <AlertDescription>{t('blindSpot.compareHowYouSeeYourselfWithObjectiveBeh')}</AlertDescription>
          </Alert>

          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              {t('blindSpot.howItWorks')}
            </h3>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">1</span>
                <p><strong>{t('blindSpot.selfRate')}:</strong>{t('blindSpot.evaluateYourselfOn10Dimensions')}</p>
              </div>
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">2</span>
                <p><strong>{t('blindSpot.scenarios')}:</strong>{t('blindSpot.makeDecisionsIn10Situations')}</p>
              </div>
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">3</span>
                <p><strong>{t('blindSpot.compare')}:</strong>{t('blindSpot.seeWherePerceptionMeetsReality')}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {t('blindSpot.whatYoullLearn')}
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-lg bg-muted">
                <div className="font-medium">{t('blindSpot.blindSpots')}</div>
                <div className="text-xs text-muted-foreground">{t('blindSpot.skillsYouOverestimate')}</div>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <div className="font-medium">{t('blindSpot.hiddenStrengths')}</div>
                <div className="text-xs text-muted-foreground">{t('blindSpot.skillsYouUndervalue')}</div>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <div className="font-medium">{t('blindSpot.selfAwareness')}</div>
                <div className="text-xs text-muted-foreground">{t('blindSpot.overallAccuracyScore')}</div>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <div className="font-medium">{t('blindSpot.coachability')}</div>
                <div className="text-xs text-muted-foreground">{t('blindSpot.growthPotentialIndicator')}</div>
              </div>
            </div>
          </div>

          <Button onClick={onStart} className="w-full" size="lg">{t('blindSpot.startAssessment')}</Button>
        </CardContent>
      </Card>
    </div>
  );
});

BlindSpotIntro.displayName = 'BlindSpotIntro';
