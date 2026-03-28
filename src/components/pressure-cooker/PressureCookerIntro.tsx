import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, AlertCircle, Target } from 'lucide-react';

interface PressureCookerIntroProps {
  scenario: {
    name: string;
    description: string;
  };
  onStart: () => void;
}

export const PressureCookerIntro = memo(({ scenario, onStart }: PressureCookerIntroProps) => {
  const { t } = useTranslation('common');
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      <Card>
        <CardHeader>
          <div className="text-6xl mb-4 text-center">🔥</div>
          <CardTitle className="text-3xl text-center">{t('pressureCooker.pressureCookerAssessment')}</CardTitle>
          <p className="text-center text-muted-foreground mt-2">
            {scenario.name}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {scenario.description}
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Target className="h-5 w-5" />
              {t('pressureCooker.howItWorks', 'How It Works')}
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• {t('pressureCooker.step1', 'Tasks will arrive throughout the 15-minute assessment')}</li>
              <li>• {t('pressureCooker.step2', 'Prioritize what matters most: urgency, impact, and deadlines')}</li>
              <li>• {t('pressureCooker.step3', 'Choose to Complete, Delegate, Defer, Skip, or Escalate each task')}</li>
              <li>• {t('pressureCooker.step4', "We'll measure your prioritization accuracy and stress handling")}</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {t('pressureCooker.whatWeMeasure', 'What We Measure')}
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-lg bg-muted">
                <div className="font-medium">{t('pressureCooker.prioritization', 'Prioritization')}</div>
                <div className="text-xs text-muted-foreground">{t('pressureCooker.taskOrderingAccuracy', 'Task ordering accuracy')}</div>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <div className="font-medium">{t('pressureCooker.stressHandling', 'Stress Handling')}</div>
                <div className="text-xs text-muted-foreground">{t('pressureCooker.performanceUnderPressure', 'Performance under pressure')}</div>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <div className="font-medium">{t('pressureCooker.multitasking', 'Multitasking')}</div>
                <div className="text-xs text-muted-foreground">{t('pressureCooker.actionVarietyAndFlow', 'Action variety and flow')}</div>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <div className="font-medium">{t('pressureCooker.communication', 'Communication')}</div>
                <div className="text-xs text-muted-foreground">{t('pressureCooker.delegationStyle', 'Delegation style')}</div>
              </div>
            </div>
          </div>

          <Button onClick={onStart} className="w-full" size="lg">{t('pressureCooker.startAssessment')}</Button>
        </CardContent>
      </Card>
    </div>
  );
});

PressureCookerIntro.displayName = 'PressureCookerIntro';
