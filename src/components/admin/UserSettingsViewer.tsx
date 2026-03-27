import { useTranslation } from 'react-i18next';
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Shield, 
  Download, 
  CheckCircle, 
  XCircle,
  MapPin,
  Briefcase,
  DollarSign,
  Clock,
  Eye,
  EyeOff,
  FileText,
  User,
  Link2,
  Globe
} from "lucide-react";
import { adminCandidateService } from "@/services/adminCandidateService";
import { toast } from "sonner";
import { DocumentPreviewDialog } from "@/components/shared/DocumentPreviewDialog";

interface UserSettingsViewerProps {
  userId: string;
  userName: string;
  source?: 'candidate_profile' | 'admin_user_profile';
}

export function UserSettingsViewer({ 
  userId, 
  userName,
  source = 'admin_user_profile'
}: UserSettingsViewerProps) {
  const { t } = useTranslation('common');
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [userId]);

  const loadSettings = async () => {
    try {
      const { data, error } = await adminCandidateService.getUserSettings(userId);
      if (error) throw error;
      setSettings(data);
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error(t("failed_to_load_user", "Failed to load user settings"));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!settings) {
    return (
      <Alert>
        <AlertDescription>
          No settings data available for this user.
        </AlertDescription>
      </Alert>
    );
  }

  const candidateProfile = settings.candidate_profiles?.[0];

  return (
    <div className="space-y-6">
      {/* Admin View Banner */}
      <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
        <Shield className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-900 dark:text-orange-200">
          🔒 Admin View: You are viewing {userName}'s complete settings. 
          This data is private and must be handled according to GDPR policies.
        </AlertDescription>
      </Alert>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">{t("full_name", "Full Name")}</h4>
              <p>{settings.full_name || '-'}</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">{t("email", "Email")}</h4>
              <p>{settings.email || '-'}</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">{t("current_title", "Current Title")}</h4>
              <p>{settings.current_title || '-'}</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">{t("location", "Location")}</h4>
              <p>{settings.location || '-'}</p>
            </div>
            {settings.bio && (
              <div className="md:col-span-2">
                <h4 className="font-medium mb-2">{t("bio", "Bio")}</h4>
                <p className="text-sm text-muted-foreground">{settings.bio}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Compensation Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Compensation Details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-3">{t("current_salary", "Current Salary")}</h4>
            {settings.current_salary_min || settings.current_salary_max ? (
              <div className="space-y-2">
                <p className="text-2xl font-bold">
                  {settings.current_salary_min?.toLocaleString()} - {settings.current_salary_max?.toLocaleString()}
                  <span className="text-base font-normal text-muted-foreground ml-2">
                    {settings.preferred_currency || 'USD'}
                  </span>
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("not_disclosed", "Not disclosed")}</p>
            )}
          </div>

          <div>
            <h4 className="font-medium mb-3">{t("desired_salary", "Desired Salary")}</h4>
            {settings.desired_salary_min || settings.desired_salary_max ? (
              <div className="space-y-2">
                <p className="text-2xl font-bold text-primary">
                  {settings.desired_salary_min?.toLocaleString()} - {settings.desired_salary_max?.toLocaleString()}
                  <span className="text-base font-normal text-muted-foreground ml-2">
                    {settings.preferred_currency || 'USD'}
                  </span>
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("not_set", "Not set")}</p>
            )}
          </div>

          {settings.employment_type_preference && (
            <div>
              <h4 className="font-medium mb-2">{t("employment_type", "Employment Type")}</h4>
              <Badge variant="secondary">{settings.employment_type_preference}</Badge>
            </div>
          )}

          {(settings.freelance_hourly_rate_min || settings.freelance_hourly_rate_max) && (
            <div>
              <h4 className="font-medium mb-2">{t("freelance_rate", "Freelance Rate")}</h4>
              <p className="font-medium">
                {settings.freelance_hourly_rate_min} - {settings.freelance_hourly_rate_max} {settings.preferred_currency}/hr
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Work Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Work Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings.preferred_work_locations && settings.preferred_work_locations.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <h4 className="font-medium">{t("preferred_locations", "Preferred Locations")}</h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {settings.preferred_work_locations.map((location: string, index: number) => (
                  <Badge key={index} variant="outline">{location}</Badge>
                ))}
              </div>
            </div>
          )}

          {settings.remote_work_preference && (
            <div>
              <h4 className="font-medium mb-2">{t("remote_preference", "Remote Preference")}</h4>
              <Badge variant="secondary">{settings.remote_work_preference}</Badge>
            </div>
          )}

          {settings.notice_period && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <h4 className="font-medium">{t("notice_period", "Notice Period")}</h4>
              </div>
              <p>{settings.notice_period}</p>
            </div>
          )}

          {settings.contract_end_date && (
            <div>
              <h4 className="font-medium mb-2">{t("contract_details", "Contract Details")}</h4>
              <p className="text-sm">
                {settings.has_indefinite_contract 
                  ? 'Indefinite contract' 
                  : `Ends: ${new Date(settings.contract_end_date).toLocaleDateString()}`
                }
              </p>
            </div>
          )}

          {(settings.fulltime_hours_per_week_min || settings.freelance_hours_per_week_min) && (
            <div>
              <h4 className="font-medium mb-3">{t("hours_per_week", "Hours per Week")}</h4>
              <div className="grid grid-cols-2 gap-4">
                {settings.fulltime_hours_per_week_min && (
                  <div>
                    <p className="text-sm text-muted-foreground">{t("fulltime", "Full-time")}</p>
                    <p className="font-medium">
                      {settings.fulltime_hours_per_week_min} - {settings.fulltime_hours_per_week_max} hrs
                    </p>
                  </div>
                )}
                {settings.freelance_hours_per_week_min && (
                  <div>
                    <p className="text-sm text-muted-foreground">{t("freelance", "Freelance")}</p>
                    <p className="font-medium">
                      {settings.freelance_hours_per_week_min} - {settings.freelance_hours_per_week_max} hrs
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Connections & Links */}
      {candidateProfile && (candidateProfile.linkedin_url || candidateProfile.github_url || candidateProfile.portfolio_url) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5" />
              Professional Links
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {candidateProfile.linkedin_url && (
              <div className="flex items-center justify-between">
                <span className="font-medium">{t("linkedin", "LinkedIn")}</span>
                <Button variant="outline" size="sm" asChild>
                  <a href={candidateProfile.linkedin_url} target="_blank" rel="noopener noreferrer">
                    <Globe className="w-4 h-4 mr-2" />
                    Visit
                  </a>
                </Button>
              </div>
            )}
            {candidateProfile.github_url && (
              <div className="flex items-center justify-between">
                <span className="font-medium">{t("github", "GitHub")}</span>
                <Button variant="outline" size="sm" asChild>
                  <a href={candidateProfile.github_url} target="_blank" rel="noopener noreferrer">
                    <Globe className="w-4 h-4 mr-2" />
                    Visit
                  </a>
                </Button>
              </div>
            )}
            {candidateProfile.portfolio_url && (
              <div className="flex items-center justify-between">
                <span className="font-medium">{t("portfolio", "Portfolio")}</span>
                <Button variant="outline" size="sm" asChild>
                  <a href={candidateProfile.portfolio_url} target="_blank" rel="noopener noreferrer">
                    <Globe className="w-4 h-4 mr-2" />
                    Visit
                  </a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Documents & Resume */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Documents & Resume
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {settings.resume_url || candidateProfile?.resume_url ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span>{t("resume_uploaded", "Resume uploaded")}</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
                <Eye className="w-4 h-4 mr-2" />
                View
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <XCircle className="w-5 h-5" />
              <span>{t("no_resume_uploaded", "No resume uploaded")}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <DocumentPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        documentUrl={settings.resume_url || candidateProfile?.resume_url}
        documentName={`${userName} - Resume`}
      />

      {/* Profile Privacy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {settings.stealth_mode_enabled ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
            Profile Privacy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">{t("stealth_mode", "Stealth Mode")}</span>
            <Badge variant={settings.stealth_mode_enabled ? "default" : "outline"}>
              {settings.stealth_mode_enabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>

          {settings.public_fields && settings.public_fields.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">{t("public_fields", "Public Fields")}</h4>
              <div className="flex flex-wrap gap-2">
                {settings.public_fields.map((field: string, index: number) => (
                  <Badge key={index} variant="outline">{field}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verification Status */}
      <Card>
        <CardHeader>
          <CardTitle>{t("verification_status", "Verification Status")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span>{t("email", "Email")}</span>
            <Badge variant={settings.email_verified ? "default" : "secondary"}>
              {settings.email_verified ? (
                <><CheckCircle className="w-3 h-3 mr-1" />{t("verified", "Verified")}</>
              ) : (
                <><XCircle className="w-3 h-3 mr-1" />{t("not_verified", "Not Verified")}</>
              )}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span>{t("phone", "Phone")}</span>
            <Badge variant={settings.phone_verified ? "default" : "secondary"}>
              {settings.phone_verified ? (
                <><CheckCircle className="w-3 h-3 mr-1" />{t("verified", "Verified")}</>
              ) : (
                <><XCircle className="w-3 h-3 mr-1" />{t("not_verified", "Not Verified")}</>
              )}
            </Badge>
          </div>

          {settings.phone && (
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground">{t("phone_number", "Phone Number")}</p>
              <p className="font-medium">{settings.phone}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
