import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import type { AlertPreferences, DeliveryMethod } from '@/hooks/useMarketAlerts';

interface AlertPreferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preferences: AlertPreferences;
  onSave: (prefs: Partial<AlertPreferences>) => void;
}

const ALERT_TYPES = [
  { key: 'competitor' as const, icon: '🏢', labelKey: 'marketAlerts.prefs.competitor' },
  { key: 'layoff' as const, icon: '📉', labelKey: 'marketAlerts.prefs.layoff' },
  { key: 'salary' as const, icon: '💰', labelKey: 'marketAlerts.prefs.salary' },
  { key: 'offer_activity' as const, icon: '📨', labelKey: 'marketAlerts.prefs.offerActivity' },
  { key: 'pipeline' as const, icon: '🔄', labelKey: 'marketAlerts.prefs.pipeline' },
] as const;

const DELIVERY_OPTIONS: { value: DeliveryMethod; labelKey: string }[] = [
  { value: 'in_app', labelKey: 'marketAlerts.prefs.delivery.inApp' },
  { value: 'in_app_email', labelKey: 'marketAlerts.prefs.delivery.inAppEmail' },
  { value: 'in_app_push', labelKey: 'marketAlerts.prefs.delivery.inAppPush' },
];

export function AlertPreferencesDialog({
  open,
  onOpenChange,
  preferences,
  onSave,
}: AlertPreferencesDialogProps) {
  const { t } = useTranslation('partner');

  const handleToggle = (key: keyof AlertPreferences) => {
    if (key === 'delivery_method') return;
    onSave({ [key]: !preferences[key] });
  };

  const handleDelivery = (value: DeliveryMethod) => {
    onSave({ delivery_method: value });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t('marketAlerts.prefs.title', 'Alert Preferences')}
          </DialogTitle>
          <DialogDescription>
            {t('marketAlerts.prefs.description', 'Choose which market alerts you receive and how.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Alert type toggles */}
          {ALERT_TYPES.map(({ key, icon, labelKey }) => (
            <div key={key} className="flex items-center justify-between">
              <Label htmlFor={`pref-${key}`} className="flex items-center gap-2 cursor-pointer">
                <span>{icon}</span>
                <span>{t(labelKey, key.replace(/_/g, ' '))}</span>
              </Label>
              <Switch
                id={`pref-${key}`}
                checked={!!preferences[key]}
                onCheckedChange={() => handleToggle(key)}
              />
            </div>
          ))}

          <Separator />

          {/* Delivery method */}
          <div className="space-y-2">
            <Label>{t('marketAlerts.prefs.deliveryLabel', 'Delivery method')}</Label>
            <Select value={preferences.delivery_method} onValueChange={handleDelivery}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DELIVERY_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {t(opt.labelKey, opt.value.replace(/_/g, ' '))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('marketAlerts.prefs.close', 'Close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
