import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { T } from '@/components/T';

interface PreferencesSettingsProps {
  preferredCurrency: 'EUR' | 'USD' | 'GBP' | 'AED' | 'BTC' | 'ETH';
  onCurrencyChange: (currency: 'EUR' | 'USD' | 'GBP' | 'AED' | 'BTC' | 'ETH') => void;
  preferredLanguage: string;
  onLanguageChange: (language: string) => void;
  jobAlertFrequency: string;
  onJobAlertFrequencyChange: (frequency: string) => void;
  companySizePreference: string;
  onCompanySizeChange: (size: string) => void;
  industryPreference: string;
  onIndustryChange: (industry: string) => void;
  workTimezone: string;
  onTimezoneChange: (timezone: string) => void;
  availableHoursPerWeek: number;
  onAvailableHoursChange: (hours: number) => void;
  onSave: () => void;
  saving: boolean;
}

export const PreferencesSettings = ({
  preferredCurrency,
  onCurrencyChange,
  preferredLanguage,
  onLanguageChange,
  jobAlertFrequency,
  onJobAlertFrequencyChange,
  companySizePreference,
  onCompanySizeChange,
  industryPreference,
  onIndustryChange,
  workTimezone,
  onTimezoneChange,
  availableHoursPerWeek,
  onAvailableHoursChange,
  onSave,
  saving
}: PreferencesSettingsProps) => {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            <T k="common:preferences.display.title" fallback="Display Preferences" />
          </CardTitle>
          <CardDescription>
            <T k="common:preferences.display.description" fallback="Customize how the platform looks for you" />
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label><T k="common:preferences.language.label" fallback="Language" /></Label>
            <Select value={preferredLanguage} onValueChange={onLanguageChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{t("english", "🇬🇧 English")}</SelectItem>
                <SelectItem value="nl">{t("nederlands", "🇳🇱 Nederlands")}</SelectItem>
                <SelectItem value="de">{t("deutsch", "🇩🇪 Deutsch")}</SelectItem>
                <SelectItem value="fr">{t("français", "🇫🇷 Français")}</SelectItem>
                <SelectItem value="es">{t("español", "🇪🇸 Español")}</SelectItem>
                <SelectItem value="zh">{t("中文_chinese", "🇨🇳 中文 (Chinese)")}</SelectItem>
                <SelectItem value="ar">{t("العربية_arabic", "🇸🇦 العربية (Arabic)")}</SelectItem>
                <SelectItem value="ru">{t("русский_russian", "🇷🇺 Русский (Russian)")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label><T k="common:preferences.timezone.label" fallback="Work Timezone" /></Label>
            <Select value={workTimezone || 'Europe/Amsterdam'} onValueChange={onTimezoneChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Europe/Amsterdam">{t("europeamsterdam_cetcest", "Europe/Amsterdam (CET/CEST)")}</SelectItem>
                <SelectItem value="America/New_York">{t("americanew_york_estedt", "America/New_York (EST/EDT)")}</SelectItem>
                <SelectItem value="Asia/Tokyo">{t("asiatokyo_jst", "Asia/Tokyo (JST)")}</SelectItem>
                <SelectItem value="Europe/London">{t("europelondon_gmtbst", "Europe/London (GMT/BST)")}</SelectItem>
                <SelectItem value="America/Los_Angeles">{t("americalos_angeles_pstpdt", "America/Los_Angeles (PST/PDT)")}</SelectItem>
                <SelectItem value="Asia/Dubai">{t("asiadubai_gst", "Asia/Dubai (GST)")}</SelectItem>
                <SelectItem value="Asia/Singapore">{t("asiasingapore_sgt", "Asia/Singapore (SGT)")}</SelectItem>
                <SelectItem value="Australia/Sydney">{t("australiasydney_aedt", "Australia/Sydney (AEDT)")}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              <T k="common:preferences.timezone.description" fallback="Your preferred timezone for meetings and work hours" />
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label><T k="common:preferences.currency.label" fallback="Currency" /></Label>
            <Select value={preferredCurrency} onValueChange={onCurrencyChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EUR">{t("eur_euro", "EUR (€) - Euro")}</SelectItem>
                <SelectItem value="USD">{t("usd_us_dollar", "USD ($) - US Dollar")}</SelectItem>
                <SelectItem value="GBP">{t("gbp_british_pound", "GBP (£) - British Pound")}</SelectItem>
                <SelectItem value="AED">{t("aed_دإ_uae_dirham", "AED (د.إ) - UAE Dirham")}</SelectItem>
                <SelectItem value="BTC">{t("btc_bitcoin", "BTC (₿) - Bitcoin")}</SelectItem>
                <SelectItem value="ETH">{t("eth_ξ_ethereum", "ETH (Ξ) - Ethereum")}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Job salaries will be automatically converted to your preferred currency
            </p>
          </div>

          <Button 
            onClick={onSave}
            disabled={saving}
            className="w-full"
          >
            {saving ? 'Saving...' : 'Save Display Preferences'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Career Preferences
          </CardTitle>
          <CardDescription>
            Tailor your job search experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>{t("job_alert_frequency", "Job Alert Frequency")}</Label>
            <Select value={jobAlertFrequency} onValueChange={onJobAlertFrequencyChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="realtime">{t("realtime_notifications", "Real-time notifications")}</SelectItem>
                <SelectItem value="daily">{t("daily_digest", "Daily digest")}</SelectItem>
                <SelectItem value="weekly">{t("weekly_digest", "Weekly digest")}</SelectItem>
                <SelectItem value="monthly">{t("monthly_digest", "Monthly digest")}</SelectItem>
                <SelectItem value="never">{t("never_send_alerts", "Never send alerts")}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              How often you want to receive job match notifications
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>{t("preferred_company_size", "Preferred Company Size")}</Label>
            <Select value={companySizePreference || 'any'} onValueChange={onCompanySizeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">{t("any_size", "Any size")}</SelectItem>
                <SelectItem value="startup">{t("startup_150_employees", "Startup (1-50 employees)")}</SelectItem>
                <SelectItem value="scaleup">{t("scaleup_51500_employees", "Scale-up (51-500 employees)")}</SelectItem>
                <SelectItem value="enterprise">{t("enterprise_500_employees", "Enterprise (500+ employees)")}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Your preferred company stage and size
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>{t("industry_preferences", "Industry Preferences")}</Label>
            <Select value={industryPreference || 'any'} onValueChange={onIndustryChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">{t("all_industries", "All industries")}</SelectItem>
                <SelectItem value="tech">{t("technology_software", "Technology & Software")}</SelectItem>
                <SelectItem value="finance">{t("finance_banking", "Finance & Banking")}</SelectItem>
                <SelectItem value="healthcare">{t("healthcare_life_sciences", "Healthcare & Life Sciences")}</SelectItem>
                <SelectItem value="ecommerce">{t("ecommerce_retail", "E-commerce & Retail")}</SelectItem>
                <SelectItem value="consulting">{t("consulting_professional_services", "Consulting & Professional Services")}</SelectItem>
                <SelectItem value="manufacturing">{t("manufacturing_industrial", "Manufacturing & Industrial")}</SelectItem>
                <SelectItem value="media">{t("media_entertainment", "Media & Entertainment")}</SelectItem>
                <SelectItem value="education">{t("education_edtech", "Education & EdTech")}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Your preferred industry sectors
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>{t("available_hours_per_week", "Available Hours Per Week")}</Label>
            <Input
              type="number"
              min="1"
              max="168"
              value={availableHoursPerWeek || ''}
              onChange={(e) => onAvailableHoursChange(parseInt(e.target.value) || 0)}
              placeholder={t("eg_40", "e.g., 40")}
            />
            <p className="text-xs text-muted-foreground">
              <T k="common:preferences.availability.description" fallback="How many hours per week you can commit (for freelance/contract work)" />
            </p>
          </div>

          <Button 
            onClick={onSave}
            disabled={saving}
            className="w-full"
          >
            {saving ? t('common:actions.loading') : t('common:actions.save_changes', 'Save Career Preferences')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
