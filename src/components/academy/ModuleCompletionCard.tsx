import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Check, ChevronRight, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { notify } from '@/lib/notify';
import { fireConfetti } from '@/utils/fireConfetti';

interface ModuleCompletionCardProps {
  moduleId: string;
  moduleName: string;
  isCompleted: boolean;
  onComplete: () => void;
  nextModuleId?: string;
  onNavigateToNext?: () => void;
}

export const ModuleCompletionCard = memo<ModuleCompletionCardProps>(({
  moduleId,
  moduleName,
  isCompleted,
  onComplete,
  nextModuleId,
  onNavigateToNext,
}) => {
  const { t } = useTranslation('common');
  const [loading, setLoading] = useState(false);

  const handleMarkComplete = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('learner_progress')
        .upsert({
          user_id: user.id,
          module_id: moduleId,
          progress_percentage: 100,
          completed: true,
          completed_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,module_id',
        });

      if (error) throw error;

      fireConfetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      notify.success(t('academy.moduleCompletedSuccess'), { description: t('academy.greatJobFinishing', { name: moduleName }) });

      onComplete();
    } catch (error) {
      console.error('Error marking complete:', error);
      notify.error(t('academy.failedToMarkComplete'));
    } finally {
      setLoading(false);
    }
  };

  if (isCompleted) {
    return (
      <Card className="p-4 bg-primary/5 border-primary/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <Check className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-medium text-foreground">{t('academy.moduleCompleted')}</span>
          </div>
          {nextModuleId && onNavigateToNext && (
            <Button onClick={onNavigateToNext} variant="outline">
              {t('academy.nextModule')}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{t('academy.finishedWatchingMarkThisModuleAsComplete')}</span>
        <Button onClick={handleMarkComplete} disabled={loading}>
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {t('academy.markAsComplete')}
        </Button>
      </div>
    </Card>
  );
});

ModuleCompletionCard.displayName = 'ModuleCompletionCard';
