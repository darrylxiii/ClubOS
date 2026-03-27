import { useTranslation } from "react-i18next";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Info, X } from "lucide-react";

interface MigrationBannerProps {
  onDismiss: () => void;
}

export const MigrationBanner = ({ onDismiss }: MigrationBannerProps) => {
  const { t } = useTranslation('common');
  return (
    <Alert className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30">
      <Info className="h-5 w-5 text-primary" />
      <div className="flex items-start justify-between flex-1">
        <div className="flex-1">
          <AlertTitle className="text-lg font-bold mb-2">
            {t('tasks.welcomeUnifiedTasks', 'Welcome to Unified Tasks (Beta)')}
          </AlertTitle>
          <AlertDescription className="space-y-2 text-sm">
            <p>
              <strong>{t('tasks.existingTasksSafe', 'All your existing tasks are safe!')}</strong> {t('tasks.migrationMergeDescription', 'This new system merges Club Tasks and Task Pilot features while preserving all your data.')}
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2 text-muted-foreground">
              <li>{t('tasks.migrationLegacyAccess', 'Access legacy systems anytime via the Task System toggle')}</li>
              <li>{t('tasks.migrationAiScheduling', 'AI-powered scheduling with manual override options')}</li>
              <li>{t('tasks.migrationUnifiedView', 'Unified view of all tasks across objectives')}</li>
              <li>{t('tasks.migrationNoDataLoss', 'No data loss - everything is tracked in migration logs')}</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-3">
              {t('tasks.migrationBetaNotice', 'This is a beta feature. Your feedback helps us improve. Use the system toggle to switch between views.')}
            </p>
          </AlertDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDismiss}
          className="ml-4 flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Alert>
  );
};
