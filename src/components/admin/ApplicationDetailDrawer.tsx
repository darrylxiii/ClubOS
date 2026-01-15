import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  User, Mail, Phone, MapPin, Briefcase, Linkedin, 
  FileText, Euro, Calendar, Home, CheckCircle, XCircle,
  Clock, Download
} from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { ensureHttpsUrl } from "@/utils/urlHelpers";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Application {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  location?: string | null;
  current_title?: string | null;
  linkedin_url?: string | null;
  bio?: string | null;
  resume_url?: string | null;
  dream_job_title?: string | null;
  employment_type?: string | null;
  notice_period?: string | null;
  current_salary?: number | null;
  desired_salary_min?: number | null;
  desired_salary_max?: number | null;
  freelance_rate?: number | null;
  remote_preference?: string | null;
  preferred_locations?: string[] | null;
  work_radius?: number | null;
  application_status: string | null;
  created_at: string;
  admin_notes?: string | null;
}

interface ApplicationDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: Application | null;
  onApprove: (application: Application) => void;
  onReject: (application: Application) => void;
  onUpdate: () => void;
}

export function ApplicationDetailDrawer({
  open,
  onOpenChange,
  application,
  onApprove,
  onReject,
  onUpdate
}: ApplicationDetailDrawerProps) {
  const { user } = useAuth();
  const [notes, setNotes] = useState(application?.admin_notes || '');
  const [isSaving, setIsSaving] = useState(false);

  if (!application) return null;

  const handleSaveNotes = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('candidate_profiles')
        .update({ admin_notes: notes })
        .eq('id', application.id);

      if (error) throw error;

      await supabase.from('candidate_application_logs').insert({
        candidate_profile_id: application.id,
        action: 'noted',
        actor_id: user?.id,
        details: { notes }
      });

      toast.success('Notes saved successfully');
      onUpdate();
    } catch (error) {
      console.error('Failed to save notes:', error);
      toast.error('Failed to save notes');
    } finally {
      setIsSaving(false);
    }
  };

  const InfoRow = ({ icon: Icon, label, value }: { icon: any; label: string; value: string | null | undefined }) => (
    <div className="flex items-start gap-3 py-2">
      <Icon className="w-4 h-4 mt-1 text-muted-foreground" />
      <div className="flex-1">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-sm font-medium mt-1">{value || 'Not specified'}</p>
      </div>
    </div>
  );

  const getStatusBadge = () => {
    const variants: Record<string, { label: string; className: string }> = {
      applied: { 
        label: 'Pending Review', 
        className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' 
      },
      approved: { 
        label: 'Approved', 
        className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
      },
      rejected: { 
        label: 'Rejected', 
        className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' 
      }
    };
    
    const variant = variants[application.application_status] || variants.applied;
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="text-2xl">{application.full_name}</SheetTitle>
              <SheetDescription>
                Applied {formatDistanceToNow(new Date(application.created_at), { addSuffix: true })}
              </SheetDescription>
            </div>
            {getStatusBadge()}
          </div>
        </SheetHeader>

        <Tabs defaultValue="overview" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="review">Review</TabsTrigger>
            <TabsTrigger value="decision">Decision</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Contact Information */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                Contact Information
              </h3>
              <div className="space-y-1">
                <InfoRow icon={Mail} label="Email" value={application.email} />
                <InfoRow icon={Phone} label="Phone" value={application.phone} />
                <InfoRow icon={MapPin} label="Location" value={application.location} />
                {application.linkedin_url && (
                  <div className="flex items-start gap-3 py-2">
                    <Linkedin className="w-4 h-4 mt-1 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">LinkedIn</p>
                      <a 
                        href={ensureHttpsUrl(application.linkedin_url) || '#'} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-primary hover:underline mt-1 inline-block"
                      >
                        View Profile
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Professional Background */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Professional Background
              </h3>
              <div className="space-y-1">
                <InfoRow icon={Briefcase} label="Current Title" value={application.current_title} />
                {application.bio && (
                  <div className="py-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Bio</p>
                    <p className="text-sm">{application.bio}</p>
                  </div>
                )}
                {application.resume_url && (
                  <div className="pt-3">
                    <Button variant="outline" size="sm" asChild>
                      <a href={application.resume_url} target="_blank" rel="noopener noreferrer">
                        <Download className="w-4 h-4 mr-2" />
                        Download Resume
                      </a>
                    </Button>
                  </div>
                )}
              </div>
            </Card>

            {/* Career Goals */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Career Goals
              </h3>
              <div className="space-y-1">
                <InfoRow icon={Briefcase} label="Dream Job Title" value={application.dream_job_title} />
                <InfoRow icon={Clock} label="Employment Type" value={application.employment_type} />
                <InfoRow icon={Calendar} label="Notice Period" value={application.notice_period} />
              </div>
            </Card>

            {/* Compensation */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Euro className="w-4 h-4" />
                Compensation Expectations
              </h3>
              <div className="space-y-1">
                <InfoRow 
                  icon={Euro} 
                  label="Current Salary" 
                  value={application.current_salary ? `€${application.current_salary.toLocaleString()}` : undefined} 
                />
                <InfoRow 
                  icon={Euro} 
                  label="Desired Salary Range" 
                  value={
                    application.desired_salary_min && application.desired_salary_max
                      ? `€${application.desired_salary_min.toLocaleString()} - €${application.desired_salary_max.toLocaleString()}`
                      : undefined
                  } 
                />
                <InfoRow 
                  icon={Euro} 
                  label="Freelance Rate" 
                  value={application.freelance_rate ? `€${application.freelance_rate}/hour` : undefined} 
                />
              </div>
            </Card>

            {/* Work Preferences */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Home className="w-4 h-4" />
                Work Preferences
              </h3>
              <div className="space-y-1">
                <InfoRow icon={Home} label="Remote Preference" value={application.remote_preference} />
                <InfoRow 
                  icon={MapPin} 
                  label="Preferred Locations" 
                  value={application.preferred_locations?.join(', ')} 
                />
                <InfoRow 
                  icon={MapPin} 
                  label="Work Radius" 
                  value={application.work_radius ? `${application.work_radius} km` : undefined} 
                />
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="review" className="space-y-4">
            <Card className="p-4">
              <Label htmlFor="admin-notes">Admin Notes</Label>
              <Textarea
                id="admin-notes"
                placeholder="Add internal notes about this candidate..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={10}
                className="mt-2"
              />
              <Button 
                onClick={handleSaveNotes} 
                disabled={isSaving}
                className="mt-3"
              >
                {isSaving ? 'Saving...' : 'Save Notes'}
              </Button>
            </Card>
          </TabsContent>

          <TabsContent value="decision" className="space-y-4">
            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-4">Application Decision</h3>
              
              {application.application_status === 'applied' ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Review the candidate's information and make a decision on their application.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      onClick={() => onApprove(application)}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      size="lg"
                    >
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Approve Application
                    </Button>
                    <Button 
                      onClick={() => onReject(application)}
                      variant="outline"
                      className="flex-1 border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      size="lg"
                    >
                      <XCircle className="w-5 h-5 mr-2" />
                      Reject Application
                    </Button>
                  </div>

                  <Separator className="my-4" />

                  <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                    <p className="text-sm font-medium">What happens when you approve:</p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                      <li>✓ User account created with platform access</li>
                      <li>✓ Profile verified and marked as approved</li>
                      <li>✓ Welcome email sent with login instructions</li>
                      <li>✓ Activity logged for audit trail</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className={`inline-flex p-4 rounded-full mb-4 ${
                    application.application_status === 'approved' 
                      ? 'bg-green-100 dark:bg-green-900/30' 
                      : 'bg-red-100 dark:bg-red-900/30'
                  }`}>
                    {application.application_status === 'approved' ? (
                      <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                    ) : (
                      <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                    )}
                  </div>
                  <h4 className="font-semibold text-lg mb-2">
                    Application {application.application_status === 'approved' ? 'Approved' : 'Rejected'}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    This application has already been reviewed.
                  </p>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
