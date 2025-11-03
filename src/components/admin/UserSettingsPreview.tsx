import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  DollarSign, 
  MapPin, 
  Briefcase, 
  FileText, 
  EyeOff, 
  Eye,
  CheckCircle,
  XCircle,
  ExternalLink,
  Loader2
} from "lucide-react";
import { adminCandidateService } from "@/services/adminCandidateService";
import { toast } from "sonner";

interface UserSettingsPreviewProps {
  userId: string;
  candidateId: string;
  onViewFull: () => void;
}

export function UserSettingsPreview({ 
  userId, 
  candidateId,
  onViewFull 
}: UserSettingsPreviewProps) {
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
      console.error('Error loading settings preview:', error);
      toast.error('Failed to load settings preview');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No settings data available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold">Candidate Settings Preview</h4>
        <Button variant="outline" size="sm" onClick={onViewFull}>
          <ExternalLink className="w-4 h-4 mr-2" />
          View Full Settings
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Compensation */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <h5 className="font-medium text-sm">Compensation</h5>
            </div>
            {settings.desired_salary_min || settings.desired_salary_max ? (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Desired</p>
                <p className="font-semibold">
                  {settings.desired_salary_min?.toLocaleString()} - {settings.desired_salary_max?.toLocaleString()}
                </p>
                <Badge variant="outline" className="text-xs mt-1">
                  {settings.preferred_currency || 'USD'}
                </Badge>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Not set</p>
            )}
          </CardContent>
        </Card>

        {/* Work Preferences */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-3">
              <Briefcase className="w-4 h-4 text-muted-foreground" />
              <h5 className="font-medium text-sm">Work Style</h5>
            </div>
            <div className="space-y-2">
              {settings.remote_work_preference ? (
                <Badge variant="secondary" className="text-xs">
                  {settings.remote_work_preference}
                </Badge>
              ) : (
                <p className="text-sm text-muted-foreground">Not set</p>
              )}
              {settings.preferred_work_locations && settings.preferred_work_locations.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span>{settings.preferred_work_locations.length} location(s)</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Documents */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <h5 className="font-medium text-sm">Documents</h5>
            </div>
            <div className="flex items-center gap-2">
              {settings.resume_url ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Resume uploaded</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">No resume</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Privacy */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-3">
              {settings.stealth_mode_enabled ? (
                <EyeOff className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Eye className="w-4 h-4 text-muted-foreground" />
              )}
              <h5 className="font-medium text-sm">Privacy</h5>
            </div>
            <Badge variant={settings.stealth_mode_enabled ? "default" : "outline"} className="text-xs">
              {settings.stealth_mode_enabled ? 'Stealth ON' : 'Public'}
            </Badge>
            {settings.public_fields && settings.public_fields.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {settings.public_fields.length} public field(s)
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional Quick Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {settings.notice_period && (
              <div>
                <p className="text-muted-foreground mb-1">Notice Period</p>
                <p className="font-medium">{settings.notice_period}</p>
              </div>
            )}
            {settings.employment_type_preference && (
              <div>
                <p className="text-muted-foreground mb-1">Employment Type</p>
                <Badge variant="outline">{settings.employment_type_preference}</Badge>
              </div>
            )}
            <div>
              <p className="text-muted-foreground mb-1">Email Verified</p>
              <div className="flex items-center gap-1">
                {settings.email_verified ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Phone Verified</p>
              <div className="flex items-center gap-1">
                {settings.phone_verified ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
