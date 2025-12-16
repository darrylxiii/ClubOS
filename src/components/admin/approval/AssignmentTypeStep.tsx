import { useState, useEffect } from "react";
import { AppRole, StaffAssignment, PipelineAssignment, AssignmentType, ExistingApplication } from "@/types/approval";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Briefcase, Users, UserPlus, Loader2, Building2, GitBranch, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Company {
  id: string;
  name: string;
}

interface Job {
  id: string;
  title: string;
  location: string | null;
  employment_type: string | null;
}

interface AssignmentTypeStepProps {
  requestType: 'candidate' | 'partner';
  existingApplications?: ExistingApplication[];
  onAssign: (
    assignmentType: AssignmentType,
    staffAssignment: StaffAssignment | null,
    pipelineAssignment: PipelineAssignment | null
  ) => void;
  onBack: () => void;
}

const AVAILABLE_ROLES: { value: AppRole; label: string; description: string }[] = [
  { value: 'admin', label: 'Admin', description: 'Full platform access and management' },
  { value: 'strategist', label: 'Strategist', description: 'Manage candidates and client relationships' },
  { value: 'partner', label: 'Partner', description: 'Company representative with hiring access' },
  { value: 'recruiter', label: 'Recruiter', description: 'Source and manage candidates' },
  { value: 'hiring_manager', label: 'Hiring Manager', description: 'Review and hire for specific roles' },
  { value: 'user', label: 'User', description: 'Basic platform access' },
];

const DEFAULT_STAGES = [
  { name: 'Applied', order: 0 },
  { name: 'Screening', order: 1 },
  { name: 'Interview', order: 2 },
  { name: 'Final Round', order: 3 },
  { name: 'Offer', order: 4 },
];

export const AssignmentTypeStep = ({ 
  requestType, 
  existingApplications = [],
  onAssign, 
  onBack 
}: AssignmentTypeStepProps) => {
  const [assignmentType, setAssignmentType] = useState<AssignmentType>(
    requestType === 'partner' ? 'staff' : 'candidate'
  );
  
  // Staff assignment state
  const [selectedRole, setSelectedRole] = useState<AppRole>('user');
  const [staffCompanyId, setStaffCompanyId] = useState<string>('');
  
  // Pipeline assignment state
  const [companies, setCompanies] = useState<Company[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [pipelineCompanyId, setPipelineCompanyId] = useState<string>('');
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [selectedStageIndex, setSelectedStageIndex] = useState<number>(0);
  
  const [loading, setLoading] = useState(true);

  // Check if selected job already has the candidate
  const isJobAlreadyAssigned = (jobId: string): boolean => {
    return existingApplications.some(app => app.job_id === jobId);
  };

  const getExistingAppForJob = (jobId: string): ExistingApplication | undefined => {
    return existingApplications.find(app => app.job_id === jobId);
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    if (pipelineCompanyId) {
      loadJobs(pipelineCompanyId);
    } else {
      setJobs([]);
      setSelectedJobId('');
    }
  }, [pipelineCompanyId]);

  // Reset job selection if selected job is already assigned
  useEffect(() => {
    if (selectedJobId && isJobAlreadyAssigned(selectedJobId)) {
      setSelectedJobId('');
    }
  }, [selectedJobId, existingApplications]);

  const loadCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error loading companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadJobs = async (companyId: string) => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, title, location, employment_type')
        .eq('company_id', companyId)
        .eq('status', 'published')
        .order('title');

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error('Error loading jobs:', error);
    }
  };

  const handleContinue = () => {
    if (assignmentType === 'skip') {
      onAssign('skip', null, null);
      return;
    }

    if (assignmentType === 'staff') {
      const staffAssignment: StaffAssignment = {
        role: selectedRole,
        companyId: selectedRole === 'partner' ? staffCompanyId : undefined,
      };
      onAssign('staff', staffAssignment, null);
      return;
    }

    if (assignmentType === 'candidate') {
      if (!selectedJobId || !pipelineCompanyId) {
        onAssign('skip', null, null);
        return;
      }
      const pipelineAssignment: PipelineAssignment = {
        jobId: selectedJobId,
        companyId: pipelineCompanyId,
        stageIndex: selectedStageIndex,
        stageName: DEFAULT_STAGES[selectedStageIndex]?.name,
      };
      onAssign('candidate', null, pipelineAssignment);
    }
  };

  const isStaffValid = () => {
    if (selectedRole === 'partner' && !staffCompanyId) return false;
    return true;
  };

  const isCandidateValid = () => {
    if (!selectedJobId || !pipelineCompanyId) return false;
    // Also invalid if job is already assigned
    if (isJobAlreadyAssigned(selectedJobId)) return false;
    return true;
  };

  const canContinue = () => {
    if (assignmentType === 'skip') return true;
    if (assignmentType === 'staff') return isStaffValid();
    if (assignmentType === 'candidate') return isCandidateValid();
    return false;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Users className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Assign Role or Pipeline</h3>
      </div>

      {/* Show existing applications warning */}
      {existingApplications.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This candidate is already in {existingApplications.length} pipeline(s): {' '}
            {existingApplications.map((app, idx) => (
              <span key={idx}>
                <strong>{app.job_title}</strong> ({app.status})
                {idx < existingApplications.length - 1 && ', '}
              </span>
            ))}
          </AlertDescription>
        </Alert>
      )}

      <RadioGroup
        value={assignmentType}
        onValueChange={(value) => setAssignmentType(value as AssignmentType)}
        className="space-y-4"
      >
        {/* Staff/Partner Assignment Option */}
        <Card className={assignmentType === 'staff' ? 'border-primary' : ''}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <RadioGroupItem value="staff" id="staff" />
              <Label htmlFor="staff" className="flex items-center gap-2 cursor-pointer">
                <UserPlus className="w-4 h-4 text-primary" />
                <CardTitle className="text-base">Assign as Partner/Staff</CardTitle>
              </Label>
            </div>
            <p className="text-sm text-muted-foreground ml-7">
              Grant platform access with a specific role (admin, strategist, partner, etc.)
            </p>
          </CardHeader>
          
          {assignmentType === 'staff' && (
            <CardContent className="space-y-4 pt-0">
              <div className="space-y-2">
                <Label htmlFor="role">Platform Role</Label>
                <select
                  id="role"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as AppRole)}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  {AVAILABLE_ROLES.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label} - {role.description}
                    </option>
                  ))}
                </select>
              </div>

              {selectedRole === 'partner' && (
                <div className="space-y-2">
                  <Label htmlFor="staffCompany">
                    <Building2 className="w-4 h-4 inline mr-1" />
                    Assign to Company (Required for Partners)
                  </Label>
                  <select
                    id="staffCompany"
                    value={staffCompanyId}
                    onChange={(e) => setStaffCompanyId(e.target.value)}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="">Select a company...</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Candidate Pipeline Assignment Option */}
        <Card className={assignmentType === 'candidate' ? 'border-primary' : ''}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <RadioGroupItem value="candidate" id="candidate" />
              <Label htmlFor="candidate" className="flex items-center gap-2 cursor-pointer">
                <Briefcase className="w-4 h-4 text-primary" />
                <CardTitle className="text-base">Assign as Candidate to Pipeline</CardTitle>
              </Label>
            </div>
            <p className="text-sm text-muted-foreground ml-7">
              Add to a job pipeline for hiring consideration (auto-creates candidate profile)
            </p>
          </CardHeader>
          
          {assignmentType === 'candidate' && (
            <CardContent className="space-y-4 pt-0">
              <div className="space-y-2">
                <Label htmlFor="pipelineCompany">
                  <Building2 className="w-4 h-4 inline mr-1" />
                  Company
                </Label>
                <select
                  id="pipelineCompany"
                  value={pipelineCompanyId}
                  onChange={(e) => setPipelineCompanyId(e.target.value)}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="">Select a company...</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>

              {pipelineCompanyId && (
                <div className="space-y-2">
                  <Label htmlFor="job">
                    <Briefcase className="w-4 h-4 inline mr-1" />
                    Job Position
                  </Label>
                  <select
                    id="job"
                    value={selectedJobId}
                    onChange={(e) => setSelectedJobId(e.target.value)}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="">Select a job...</option>
                    {jobs.map((job) => {
                      const existingApp = getExistingAppForJob(job.id);
                      const isDisabled = !!existingApp;
                      return (
                        <option key={job.id} value={job.id} disabled={isDisabled}>
                          {job.title} {job.location && `(${job.location})`}
                          {isDisabled && ` - Already assigned (${existingApp?.status})`}
                        </option>
                      );
                    })}
                  </select>
                  {jobs.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No active jobs found for this company
                    </p>
                  )}
                  {selectedJobId && isJobAlreadyAssigned(selectedJobId) && (
                    <Alert variant="destructive" className="mt-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Candidate is already in this pipeline. Please select a different job.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {selectedJobId && !isJobAlreadyAssigned(selectedJobId) && (
                <div className="space-y-2">
                  <Label htmlFor="stage">
                    <GitBranch className="w-4 h-4 inline mr-1" />
                    Starting Pipeline Stage
                  </Label>
                  <select
                    id="stage"
                    value={selectedStageIndex.toString()}
                    onChange={(e) => setSelectedStageIndex(parseInt(e.target.value))}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    {DEFAULT_STAGES.map((stage) => (
                      <option key={stage.order} value={stage.order.toString()}>
                        {stage.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Skip Assignment Option */}
        <Card className={assignmentType === 'skip' ? 'border-primary' : ''}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <RadioGroupItem value="skip" id="skip" />
              <Label htmlFor="skip" className="cursor-pointer">
                <CardTitle className="text-base">Skip Assignment</CardTitle>
              </Label>
            </div>
            <p className="text-sm text-muted-foreground ml-7">
              Approve without assigning a role or adding to a pipeline. Can be done later.
            </p>
          </CardHeader>
        </Card>
      </RadioGroup>

      <div className="flex items-center justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleContinue} disabled={!canContinue()}>
          Continue to Confirmation
        </Button>
      </div>
    </div>
  );
};