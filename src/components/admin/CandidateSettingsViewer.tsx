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
  FileText
} from "lucide-react";
import { adminCandidateService } from "@/services/adminCandidateService";
import { toast } from "sonner";

interface CandidateSettingsViewerProps {
  userId: string;
  candidateName: string;
}

export function CandidateSettingsViewer({ 
  userId, 
  candidateName 
}: CandidateSettingsViewerProps) {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, [userId]);

  const loadSettings = async () => {
    try {
      const { data, error } = await adminCandidateService.getCandidateSettings(userId);
      if (error) throw error;
      setSettings(data);
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load candidate settings');
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
          No settings data available for this candidate.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Admin View Banner */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          You are viewing {candidateName}'s settings as an administrator. 
          This data is private and should be handled with care.
        </AlertDescription>
      </Alert>

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
            <h4 className="font-medium mb-3">Current Salary</h4>
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
              <p className="text-sm text-muted-foreground">Not disclosed</p>
            )}
          </div>

          <div>
            <h4 className="font-medium mb-3">Desired Salary</h4>
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
              <p className="text-sm text-muted-foreground">Not set</p>
            )}
          </div>

          {settings.employment_type_preference && (
            <div>
              <h4 className="font-medium mb-2">Employment Type</h4>
              <Badge variant="secondary">{settings.employment_type_preference}</Badge>
            </div>
          )}

          {(settings.freelance_hourly_rate_min || settings.freelance_hourly_rate_max) && (
            <div>
              <h4 className="font-medium mb-2">Freelance Rate</h4>
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
                <h4 className="font-medium">Preferred Locations</h4>
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
              <h4 className="font-medium mb-2">Remote Preference</h4>
              <Badge variant="secondary">{settings.remote_work_preference}</Badge>
            </div>
          )}

          {settings.notice_period && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <h4 className="font-medium">Notice Period</h4>
              </div>
              <p>{settings.notice_period}</p>
            </div>
          )}

          {settings.contract_end_date && (
            <div>
              <h4 className="font-medium mb-2">Contract Details</h4>
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
              <h4 className="font-medium mb-3">Hours per Week</h4>
              <div className="grid grid-cols-2 gap-4">
                {settings.fulltime_hours_per_week_min && (
                  <div>
                    <p className="text-sm text-muted-foreground">Full-time</p>
                    <p className="font-medium">
                      {settings.fulltime_hours_per_week_min} - {settings.fulltime_hours_per_week_max} hrs
                    </p>
                  </div>
                )}
                {settings.freelance_hours_per_week_min && (
                  <div>
                    <p className="text-sm text-muted-foreground">Freelance</p>
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

      {/* Documents & Resume */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Documents & Resume
          </CardTitle>
        </CardHeader>
        <CardContent>
          {settings.resume_url ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span>Resume uploaded</span>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href={settings.resume_url} target="_blank" rel="noopener noreferrer">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </a>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <XCircle className="w-5 h-5" />
              <span>No resume uploaded</span>
            </div>
          )}
        </CardContent>
      </Card>

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
            <span className="font-medium">Stealth Mode</span>
            <Badge variant={settings.stealth_mode_enabled ? "default" : "outline"}>
              {settings.stealth_mode_enabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>

          {settings.public_fields && settings.public_fields.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Public Fields</h4>
              <div className="flex flex-wrap gap-2">
                {settings.public_fields.map((field: string, index: number) => (
                  <Badge key={index} variant="outline">{field}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Details */}
      <Card>
        <CardHeader>
          <CardTitle>Verification Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span>Email</span>
            <Badge variant={settings.email_verified ? "default" : "secondary"}>
              {settings.email_verified ? (
                <><CheckCircle className="w-3 h-3 mr-1" /> Verified</>
              ) : (
                <><XCircle className="w-3 h-3 mr-1" /> Not Verified</>
              )}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span>Phone</span>
            <Badge variant={settings.phone_verified ? "default" : "secondary"}>
              {settings.phone_verified ? (
                <><CheckCircle className="w-3 h-3 mr-1" /> Verified</>
              ) : (
                <><XCircle className="w-3 h-3 mr-1" /> Not Verified</>
              )}
            </Badge>
          </div>

          {settings.phone && (
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground">Phone Number</p>
              <p className="font-medium">{settings.phone}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
