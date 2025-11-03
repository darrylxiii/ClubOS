import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  DollarSign, 
  Clock, 
  MapPin, 
  Briefcase, 
  Download,
  Shield,
  Eye,
  FileText
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { VisibilityRules } from "@/utils/candidateVisibility";

interface EnhancedCandidateDetailsProps {
  candidate: any;
  profile: any;
  visibility: VisibilityRules;
  appliedToOurJob: boolean;
}

export function EnhancedCandidateDetails({
  candidate,
  profile,
  visibility,
  appliedToOurJob,
}: EnhancedCandidateDetailsProps) {
  const currency = profile?.preferred_currency || candidate?.preferred_currency || 'USD';
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Show limited access notice
  if (!appliedToOurJob && !visibility.desiredSalary) {
    return (
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Limited candidate information available. Full details visible when candidate applies to your jobs.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Compensation Expectations */}
      {visibility.desiredSalary && (profile?.desired_salary_min || candidate?.desired_salary_min) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="w-4 h-4" />
              Compensation Expectations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Desired Salary</p>
              <p className="text-lg font-semibold">
                {formatCurrency(profile?.desired_salary_min || candidate?.desired_salary_min)}
                {(profile?.desired_salary_max || candidate?.desired_salary_max) && 
                  ` - ${formatCurrency(profile?.desired_salary_max || candidate?.desired_salary_max)}`
                }
              </p>
            </div>

            {visibility.currentSalary && profile?.current_salary_min && (
              <div className="pt-3 border-t">
                <p className="text-sm text-muted-foreground mb-1">Current Salary</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(profile.current_salary_min)}
                  {profile.current_salary_max && ` - ${formatCurrency(profile.current_salary_max)}`}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Work Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Briefcase className="w-4 h-4" />
            Work Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {visibility.remotePreference && (profile?.remote_work_preference || candidate?.remote_preference) && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Remote Preference</p>
              <Badge variant="secondary">
                {profile?.remote_work_preference || candidate?.remote_preference}
              </Badge>
            </div>
          )}

          {visibility.employmentType && profile?.employment_type_preference && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Employment Type</p>
              <Badge variant="secondary">
                {profile.employment_type_preference}
              </Badge>
            </div>
          )}

          {visibility.noticePeriod && (profile?.notice_period || candidate?.notice_period) && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Notice Period</p>
                <p className="font-medium">{profile?.notice_period || candidate?.notice_period}</p>
              </div>
            </div>
          )}

          {visibility.location && (profile?.preferred_work_locations || candidate?.desired_locations) && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Preferred Locations</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(profile?.preferred_work_locations || candidate?.desired_locations || []).map((loc: string, idx: number) => (
                  <Badge key={idx} variant="outline">{loc}</Badge>
                ))}
              </div>
            </div>
          )}

          {profile?.freelance_hourly_rate_min && (
            <div className="pt-3 border-t">
              <p className="text-sm text-muted-foreground mb-1">Freelance Rate</p>
              <p className="font-medium">
                {formatCurrency(profile.freelance_hourly_rate_min)}
                {profile.freelance_hourly_rate_max && 
                  ` - ${formatCurrency(profile.freelance_hourly_rate_max)}`
                }/hr
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resume & Documents */}
      {visibility.resumeUrl && profile?.resume_url && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="w-4 h-4" />
              Resume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-green-600" />
                <span className="text-sm">Resume available</span>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href={profile.resume_url} target="_blank" rel="noopener noreferrer">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contact Information */}
      {(visibility.email || visibility.phone) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {visibility.email && (candidate?.email || profile?.email) && (
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{candidate?.email || profile?.email}</p>
              </div>
            )}
            {visibility.phone && profile?.phone && (
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{profile.phone}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
