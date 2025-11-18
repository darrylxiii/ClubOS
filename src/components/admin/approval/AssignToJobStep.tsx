import { useState, useEffect } from "react";
import { JobAssignment } from "@/types/approval";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Briefcase, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Company {
  id: string;
  name: string;
}

interface Job {
  id: string;
  title: string;
  location: string | null;
  employment_type: string | null;
  salary_min: number | null;
  salary_max: number | null;
}

interface AssignToJobStepProps {
  onAssign: (assignment: JobAssignment | null) => void;
  onBack: () => void;
}

export const AssignToJobStep = ({ onAssign, onBack }: AssignToJobStepProps) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stages, setStages] = useState<{ name: string; order: number }[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [selectedStageIndex, setSelectedStageIndex] = useState<number>(0);
  const [skipAssignment, setSkipAssignment] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingStages, setLoadingStages] = useState(false);

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      loadJobs(selectedCompanyId);
    } else {
      setJobs([]);
      setSelectedJobId('');
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    if (selectedJobId) {
      const loadDefaultStages = async () => {
        setLoadingStages(true);
        setStages([
          { name: 'Applied', order: 0 },
          { name: 'Screening', order: 1 },
          { name: 'Interview', order: 2 },
          { name: 'Final Round', order: 3 },
        ]);
        setLoadingStages(false);
      };
      loadDefaultStages();
    } else {
      setStages([]);
      setSelectedStageIndex(0);
    }
  }, [selectedJobId]);

  const loadCompanies = async () => {
    try {
      const query = (supabase as any)
        .from('companies')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      const { data, error } = await query;

      if (error) throw error;
      setCompanies((data as Company[]) || []);
    } catch (error) {
      console.error('Error loading companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadJobs = async (companyId: string) => {
    try {
      const query = (supabase as any)
        .from('jobs')
        .select('id, title, location, employment_type, salary_min, salary_max')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('title');

      const { data, error } = await query;

      if (error) throw error;
      setJobs((data as Job[]) || []);
    } catch (error) {
      console.error('Error loading jobs:', error);
    }
  };

  const handleContinue = () => {
    if (skipAssignment || !selectedJobId || !selectedCompanyId) {
      onAssign(null);
    } else {
      onAssign({
        jobId: selectedJobId,
        companyId: selectedCompanyId,
        stageIndex: selectedStageIndex,
      });
    }
  };

  const formatSalary = (min: number | null, max: number | null) => {
    if (!min && !max) return '';
    if (min && max) return `€${min.toLocaleString()} - €${max.toLocaleString()}`;
    if (min) return `From €${min.toLocaleString()}`;
    if (max) return `Up to €${max.toLocaleString()}`;
    return '';
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
        <Briefcase className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Assign to Company & Role</h3>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <select
              id="company"
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              disabled={skipAssignment}
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Select a company...</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>

          {selectedCompanyId && (
            <div className="space-y-2">
              <Label htmlFor="job">Role (Optional)</Label>
            <select
              id="job"
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              disabled={skipAssignment}
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Select a role...</option>
              {jobs.map((job) => {
                const details = [
                  job.location,
                  job.employment_type,
                  formatSalary(job.salary_min, job.salary_max)
                ].filter(Boolean).join(' • ');
                
                return (
                  <option key={job.id} value={job.id}>
                    {job.title} {details && `(${details})`}
                  </option>
                );
              })}
            </select>
              {jobs.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No active roles found for this company
                </p>
              )}
            </div>
          )}

          {selectedJobId && stages.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="stage">Starting Pipeline Stage</Label>
              <select
                id="stage"
                value={selectedStageIndex.toString()}
                onChange={(e) => setSelectedStageIndex(parseInt(e.target.value))}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {stages.map((stage) => (
                  <option key={stage.order} value={stage.order.toString()}>
                    {stage.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="border-t pt-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="skip_assignment"
                checked={skipAssignment}
                onCheckedChange={(checked) => {
                  setSkipAssignment(checked as boolean);
                  if (checked) {
                    setSelectedCompanyId('');
                    setSelectedJobId('');
                  }
                }}
              />
              <Label htmlFor="skip_assignment" className="cursor-pointer">
                Add as general candidate (no role assignment)
              </Label>
            </div>
            <p className="text-sm text-muted-foreground mt-2 ml-6">
              The candidate will be added to the talent pool without being assigned to a specific role
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button 
          onClick={handleContinue}
          disabled={!skipAssignment && !selectedJobId}
        >
          Continue to Confirmation
        </Button>
      </div>
    </div>
  );
};
