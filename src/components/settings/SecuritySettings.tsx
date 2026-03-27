import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Lock, Shield } from 'lucide-react';
import { TwoFactorSettings } from '@/components/TwoFactorSettings';
import { AccountLinking } from '@/components/AccountLinking';
import { GDPRControls } from './GDPRControls';

export const SecuritySettings = () => {
  const { t } = useTranslation('settings');
  return (
    <div className="space-y-4">
      <TwoFactorSettings />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            {t('security.password')}
          </CardTitle>
          <CardDescription>
            {t('security.passwordDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('security.changePassword')}</Label>
            <p className="text-sm text-muted-foreground">
              {t('security.changePasswordWarning')}
            </p>
            <Button variant="outline">
              {t('security.changePassword')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AccountLinking />
      
      <GDPRControls />
    </div>
  );
};
