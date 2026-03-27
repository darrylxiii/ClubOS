import { useTranslation } from 'react-i18next';
export function TrustBadges() {
  const { t } = useTranslation('common');
  return (
    <div className="text-center py-3">
      <p className="text-xs text-muted-foreground/70 tracking-wide">
        GDPR compliant · End-to-end encrypted
      </p>
    </div>
  );
}

export function TrustBadgesMinimal() {
  return (
    <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground py-2">
      <span>{t("secure", "Secure")}</span>
      <span>{t("encrypted", "Encrypted")}</span>
      <span>GDPR</span>
    </div>
  );
}
