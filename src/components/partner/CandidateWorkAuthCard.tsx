import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Globe, DollarSign, Clock, MapPin, FileCheck, 
  AlertTriangle, CheckCircle2 
} from "lucide-react";
import { useFieldPermissions } from "@/hooks/useFieldPermissions";
import { useTranslation } from 'react-i18next';

interface Props {
  candidate: any;
}

export const CandidateWorkAuthCard = ({ candidate }: Props) => {
  const { t } = useTranslation('partner');
  const { canEditField } = useFieldPermissions();
  const workAuth = candidate.work_authorization || {};
  const hasWorkAuth = Object.keys(workAuth).length > 0;

  return (
    <div className="space-y-6">
      {/* Work Authorization Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="w-5 h-5" />
            {t('candidateWorkAuthCard.workAuthorization', 'Work Authorization')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasWorkAuth ? (
            <>
              {workAuth.countries && (
                <div>
                  <p className="text-sm font-medium mb-2">{t('candidateWorkAuthCard.authorizedCountries', 'Authorized Countries')}:</p>
                  <div className="flex flex-wrap gap-2">
                    {workAuth.countries.map((country: string, idx: number) => (
                      <Badge key={idx} variant="secondary">
                        <Globe className="w-3 h-3 mr-1" />
                        {country}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {workAuth.visa_type && (
                <div>
                  <p className="text-sm font-medium mb-1">{t('candidateWorkAuthCard.visaType', 'Visa Type')}:</p>
                  <p className="text-sm text-muted-foreground">{workAuth.visa_type}</p>
                </div>
              )}
              
              {workAuth.sponsorship_required !== undefined && (
                <div className="flex items-center gap-2">
                  {workAuth.sponsorship_required ? (
                    <>
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span className="text-sm">{t('candidateWorkAuthCard.requiresSponsorship')}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="text-sm">{t('candidateWorkAuthCard.noSponsorshipRequired')}</span>
                    </>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t('candidateWorkAuthCard.noWorkAuthorizationDataAvailable')}</p>
          )}
        </CardContent>
      </Card>

      {/* Salary Expectations */}
      {(candidate.desired_salary_min || candidate.desired_salary_max) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              {t('candidateWorkAuthCard.compensationExpectations', 'Compensation Expectations')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('candidateWorkAuthCard.salaryRange', 'Salary Range')}:</span>
              <span className="text-lg font-bold">
                {candidate.preferred_currency || 'EUR'}{' '}
                {candidate.desired_salary_min?.toLocaleString()} -{' '}
                {candidate.desired_salary_max?.toLocaleString()}
              </span>
            </div>
            {candidate.preferred_currency && candidate.preferred_currency !== 'EUR' && (
              <p className="text-xs text-muted-foreground">
                {t('candidateWorkAuthCard.currency', 'Currency')}: {candidate.preferred_currency}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notice Period */}
      {candidate.notice_period && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              {t('candidateWorkAuthCard.availability', 'Availability')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('candidateWorkAuthCard.noticePeriod', 'Notice Period')}:</span>
              <span className="text-lg font-semibold">{candidate.notice_period}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Location Preferences */}
      {candidate.desired_locations && candidate.desired_locations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              {t('candidateWorkAuthCard.locationPreferences', 'Location Preferences')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {candidate.desired_locations.map((location: string, idx: number) => (
                <Badge key={idx} variant="outline">
                  {location}
                </Badge>
              ))}
            </div>
            {candidate.remote_preference && (
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground">
                  {t('candidateWorkAuthCard.remotePreference', 'Remote Preference')}:{' '}
                  <span className="font-medium capitalize text-foreground">
                    {candidate.remote_preference.replace(/_/g, ' ')}
                  </span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
