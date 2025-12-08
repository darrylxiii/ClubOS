import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Briefcase, User, Loader2 } from "lucide-react";
import { useCreateReferralPolicy } from "@/hooks/useReferralSystem";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ClaimReferralDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClaimReferralDialog({ open, onOpenChange }: ClaimReferralDialogProps) {
  const [activeTab, setActiveTab] = useState<'company' | 'job' | 'member'>('company');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [memberEmail, setMemberEmail] = useState('');
  const [notes, setNotes] = useState('');

  const createPolicy = useCreateReferralPolicy();

  // Fetch companies
  const { data: companies = [] } = useQuery({
    queryKey: ['companies-for-referral'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, logo_url')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch jobs
  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs-for-referral'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, title, company:companies(name)')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const handleSubmit = async () => {
    if (activeTab === 'company' && !selectedCompanyId) return;
    if (activeTab === 'job' && !selectedJobId) return;
    if (activeTab === 'member' && !memberEmail) return;

    try {
      await createPolicy.mutateAsync({
        policy_type: activeTab,
        company_id: activeTab === 'company' ? selectedCompanyId : undefined,
        job_id: activeTab === 'job' ? selectedJobId : undefined,
        source_type: activeTab === 'company' ? 'brought_company' : activeTab === 'job' ? 'brought_job' : 'member_referral',
        share_percentage: 10,
        notes,
      });
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create policy:', error);
    }
  };

  const resetForm = () => {
    setSelectedCompanyId('');
    setSelectedJobId('');
    setMemberEmail('');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Claim Referral</DialogTitle>
          <DialogDescription>
            Track your contributions and earn a share of placement fees
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="company" className="gap-2">
              <Building2 className="h-4 w-4" />
              Company
            </TabsTrigger>
            <TabsTrigger value="job" className="gap-2">
              <Briefcase className="h-4 w-4" />
              Job
            </TabsTrigger>
            <TabsTrigger value="member" className="gap-2">
              <User className="h-4 w-4" />
              Member
            </TabsTrigger>
          </TabsList>

          <div className="mt-6 space-y-4">
            <TabsContent value="company" className="mt-0 space-y-4">
              <div className="space-y-2">
                <Label>Select Company</Label>
                <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a company you brought in" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  All current and future jobs from this company will be tracked
                </p>
              </div>
            </TabsContent>

            <TabsContent value="job" className="mt-0 space-y-4">
              <div className="space-y-2">
                <Label>Select Job</Label>
                <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a job you sourced" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobs.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.title} {job.company?.name ? `at ${job.company.name}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Earn 10% of the placement fee when this role is filled
                </p>
              </div>
            </TabsContent>

            <TabsContent value="member" className="mt-0 space-y-4">
              <div className="space-y-2">
                <Label>Member Email</Label>
                <Input
                  type="email"
                  placeholder="colleague@company.com"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Earn rewards when members you refer get placed
                </p>
              </div>
            </TabsContent>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="How did you bring in this referral?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={createPolicy.isPending}
          >
            {createPolicy.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Claim Referral
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
