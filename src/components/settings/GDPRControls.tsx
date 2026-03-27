import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Download, Trash2, Shield, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { notify } from '@/lib/notify';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export const GDPRControls = () => {
  const { t } = useTranslation('settings');
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletionReason, setDeletionReason] = useState('');
  const [pendingDeletion, setPendingDeletion] = useState<any>(null);

  const handleExportData = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('gdpr-export');
      
      if (error) throw error;

      if (data.export_url) {
        window.open(data.export_url, '_blank');
        notify.success('Data Export Ready', { 
          description: 'Your data has been exported. The download will start shortly.' 
        });
      }
    } catch (error: unknown) {
      notify.error('Export Failed', { description: error instanceof Error ? error.message : 'Failed to export data' });
    } finally {
      setExporting(false);
    }
  };

  const handleRequestDeletion = async () => {
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('gdpr-delete', {
        body: { action: 'request', reason: deletionReason },
      });
      
      if (error) throw error;

      setPendingDeletion(data);
      notify.success('Deletion Scheduled', { 
        description: `Your account will be deleted on ${new Date(data.scheduled_for).toLocaleDateString()}. You can cancel this anytime before then.` 
      });
      setDeletionReason('');
    } catch (error: unknown) {
      notify.error('Deletion Request Failed', { 
        description: error instanceof Error ? error.message : 'Failed to schedule account deletion' 
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelDeletion = async () => {
    try {
      const { error } = await supabase.functions.invoke('gdpr-delete', {
        body: { action: 'cancel' },
      });
      
      if (error) throw error;

      setPendingDeletion(null);
      notify.success('Deletion Cancelled', { description: 'Your account deletion has been cancelled.' });
    } catch (error: unknown) {
      notify.error('Cancellation Failed', { description: error instanceof Error ? error.message : 'Failed to cancel deletion' });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            {t('gdpr.privacyDataRights')}
          </CardTitle>
          <CardDescription>
            {t('gdpr.privacyDataRightsDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Export Data */}
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <Label className="text-base">{t('gdpr.exportYourData')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('gdpr.exportDataDesc')}
                </p>
              </div>
              <Button 
                onClick={handleExportData} 
                disabled={exporting}
                variant="outline"
              >
                <Download className="w-4 h-4 mr-2" />
                {exporting ? t('gdpr.exporting') : t('gdpr.exportData')}
              </Button>
            </div>
          </div>

          {/* Delete Account */}
          <div className="space-y-3 pt-6 border-t">
            <div className="space-y-1">
              <Label className="text-base text-destructive flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {t('gdpr.deleteAccount')}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t('gdpr.deleteAccountDesc')}
              </p>
            </div>

            {pendingDeletion ? (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg space-y-3">
                <p className="text-sm font-medium text-destructive">
                  Account deletion scheduled for {new Date(pendingDeletion.scheduled_for).toLocaleDateString()}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('gdpr.canCancelBefore')}
                </p>
                <Button 
                  onClick={handleCancelDeletion}
                  variant="outline"
                  size="sm"
                >
                  {t('gdpr.cancelDeletion')}
                </Button>
              </div>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t('gdpr.deleteMyAccount')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('gdpr.areYouSure')}</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                      <p>
                        This will schedule your account for permanent deletion in 30 days. All of your data including:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>Profile information</li>
                        <li>Applications and submissions</li>
                        <li>Messages and conversations</li>
                        <li>Documents and uploads</li>
                        <li>Activity history</li>
                      </ul>
                      <p className="font-medium">
                        will be permanently deleted. You can cancel this request anytime within the 30-day grace period.
                      </p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="space-y-2 py-4">
                    <Label htmlFor="reason">{t('gdpr.deletionReason')}</Label>
                    <Textarea
                      id="reason"
                      placeholder={t('gdpr.deletionReasonPlaceholder')}
                      value={deletionReason}
                      onChange={(e) => setDeletionReason(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('common:actions.cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleRequestDeletion}
                      disabled={deleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleting ? t('common:status.processing') : t('gdpr.scheduleDeletion')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
