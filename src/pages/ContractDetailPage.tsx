import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MilestoneTimeline } from "@/components/contracts/MilestoneTimeline";
import { PaymentSchedule } from "@/components/contracts/PaymentSchedule";
import { MilestoneRevisionModal } from "@/components/contracts/MilestoneRevisionModal";
import { MilestoneFileUploadModal } from "@/components/contracts/MilestoneFileUploadModal";
import { MilestoneCommentsDrawer } from "@/components/contracts/MilestoneCommentsDrawer";
import { ContractDocumentUpload } from "@/components/contracts/ContractDocumentUpload";
import { ContractDocumentsList } from "@/components/contracts/ContractDocumentsList";
import { ProjectContract, ProjectMilestone } from "@/types/projects";
import { 
  ArrowLeft, 
  FileText, 
  Download,
  AlertTriangle,
  MessageCircle,
  Clock,
  Building2,
  User,
  Calendar,
  DollarSign
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";

export default function ContractDetailPage() {
  const { contractId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [commentsDrawerOpen, setCommentsDrawerOpen] = useState(false);

  // Fetch contract details
  const { data: contract, isLoading: contractLoading } = useQuery({
    queryKey: ['contract', contractId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_contracts' as any)
        .select('*')
        .eq('id', contractId)
        .single();

      if (error) throw error;
      return data as unknown as ProjectContract;
    },
    enabled: !!contractId
  });

  // Fetch milestones
  const { data: milestones = [], isLoading: milestonesLoading } = useQuery({
    queryKey: ['milestones', contractId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_milestones' as any)
        .select('*')
        .eq('contract_id', contractId)
        .order('milestone_number', { ascending: true });

      if (error) throw error;
      return data as unknown as ProjectMilestone[];
    },
    enabled: !!contractId
  });

  // Determine user view
  const userView = contract?.freelancer_id === user?.id ? 'freelancer' : 'client';

  const handleStartMilestone = async (milestoneId: string) => {
    try {
      const { error } = await supabase
        .from('project_milestones' as any)
        .update({ 
          status: 'in_progress',
          started_at: new Date().toISOString()
        })
        .eq('id', milestoneId);

      if (error) throw error;
      toast.success("Milestone started!");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleSubmitForReview = async (milestoneId: string) => {
    try {
      const { error } = await supabase
        .from('project_milestones' as any)
        .update({ 
          status: 'submitted',
          submitted_at: new Date().toISOString()
        })
        .eq('id', milestoneId);

      if (error) throw error;
      toast.success("Milestone submitted for review!");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleApproveMilestone = async (milestoneId: string) => {
    try {
      const { error } = await supabase
        .from('project_milestones' as any)
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('id', milestoneId);

      if (error) throw error;
      
      // Trigger payment release via edge function
      try {
        const { error: paymentError } = await supabase.functions.invoke('release-milestone-payment', {
          body: { milestoneId, contractId },
        });
        
        if (paymentError) {
          console.error('Payment release error:', paymentError);
          toast.warning("Milestone approved, but payment release failed. Please contact support.");
        } else {
          toast.success("Milestone approved! Payment released successfully.");
        }
      } catch (paymentErr) {
        console.error('Payment release exception:', paymentErr);
        toast.warning("Milestone approved, but payment release failed. Please contact support.");
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleRequestRevision = async (milestoneId: string) => {
    setSelectedMilestoneId(milestoneId);
    setRevisionModalOpen(true);
  };

  const handleUploadDeliverable = (milestoneId: string) => {
    setSelectedMilestoneId(milestoneId);
    setUploadModalOpen(true);
  };

  const handleViewComments = (milestoneId: string) => {
    setSelectedMilestoneId(milestoneId);
    setCommentsDrawerOpen(true);
  };

  const handleRefreshMilestones = () => {
    // Refetch milestones after actions
    window.location.reload(); // Simple refresh, could use query invalidation instead
  };

  const handleOpenDispute = () => {
    navigate(`/contracts/${contractId}/dispute`);
  };

  if (contractLoading || !contract) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'pending_signature': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'completed': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'disputed': return 'bg-red-500/10 text-red-600 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto p-6">
        {/* Back button */}
        <Button 
          variant="ghost" 
          onClick={() => navigate('/contracts')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Contracts
        </Button>

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-foreground">
                Contract #{contract.id.slice(0, 8)}
              </h1>
              <Badge className={`${getStatusColor(contract.contract_status)} border`}>
                {contract.contract_status.split('_').map(w => 
                  w.charAt(0).toUpperCase() + w.slice(1)
                ).join(' ')}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {userView === 'freelancer' ? 'You are the freelancer' : 'You are the client'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {contract.contract_status === 'pending_signature' && (
              <Button onClick={() => navigate(`/contracts/${contractId}/sign`)}>
                Sign Contract
              </Button>
            )}
            {contract.contract_status === 'active' && (
              <>
                <Button variant="outline" onClick={handleOpenDispute}>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Open Dispute
                </Button>
                <Button>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Message {userView === 'freelancer' ? 'Client' : 'Freelancer'}
                </Button>
              </>
            )}
            {contract.contract_document_url && (
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download Contract
              </Button>
            )}
          </div>
        </div>

        {/* Contract info cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4 border border-border/50">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-primary" />
              <div>
                <div className="text-xs text-muted-foreground">Total Budget</div>
                <div className="text-xl font-bold text-foreground">
                  €{contract.total_budget?.toLocaleString()}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4 border border-border/50">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <div className="text-xs text-muted-foreground">Contract Type</div>
                <div className="text-xl font-bold text-foreground capitalize">
                  {contract.contract_type}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4 border border-border/50">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-primary" />
              <div>
                <div className="text-xs text-muted-foreground">Timeline</div>
                <div className="text-sm font-bold text-foreground">
                  {contract.start_date && contract.end_date ? (
                    <>
                      {format(new Date(contract.start_date), 'MMM d')} - {' '}
                      {format(new Date(contract.end_date), 'MMM d')}
                    </>
                  ) : 'TBD'}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4 border border-border/50">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-primary" />
              <div>
                <div className="text-xs text-muted-foreground">Milestones</div>
                <div className="text-xl font-bold text-foreground">
                  {milestones.filter(m => m.status === 'paid').length} / {milestones.length}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Main content tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="milestones">Milestones</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            {contract.contract_type === 'hourly' && (
              <TabsTrigger value="time">Time Tracking</TabsTrigger>
            )}
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Milestones preview */}
                <Card className="p-6 border border-border/50">
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    Milestone Progress
                  </h3>
                  <MilestoneTimeline 
                    milestones={milestones}
                    view={userView}
                    onStartMilestone={handleStartMilestone}
                    onUploadDeliverable={handleUploadDeliverable}
                    onSubmitForReview={handleSubmitForReview}
                    onApproveMilestone={handleApproveMilestone}
                    onRequestRevision={handleRequestRevision}
                    onViewComments={handleViewComments}
                  />
                </Card>
              </div>

              <div className="space-y-6">
                {/* Payment schedule */}
                <PaymentSchedule 
                  contract={contract}
                  milestones={milestones}
                  view={userView}
                />

                {/* Party info */}
                <Card className="p-6 border border-border/50">
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    {userView === 'freelancer' ? 'Client' : 'Freelancer'} Information
                  </h3>
                  <div className="flex items-center gap-3 mb-4">
                    {userView === 'freelancer' ? (
                      <>
                        <Building2 className="h-10 w-10 text-muted-foreground" />
                        <div>
                          <div className="font-medium text-foreground">Company Name</div>
                          <div className="text-sm text-muted-foreground">
                            Company ID: {contract.company_id}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <User className="h-10 w-10 text-muted-foreground" />
                        <div>
                          <div className="font-medium text-foreground">Freelancer Name</div>
                          <div className="text-sm text-muted-foreground">
                            Freelancer ID: {contract.freelancer_id}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  <Button variant="outline" className="w-full">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Send Message
                  </Button>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="milestones">
            <MilestoneTimeline 
              milestones={milestones}
              view={userView}
              onStartMilestone={handleStartMilestone}
              onUploadDeliverable={handleUploadDeliverable}
              onSubmitForReview={handleSubmitForReview}
              onApproveMilestone={handleApproveMilestone}
              onRequestRevision={handleRequestRevision}
              onViewComments={handleViewComments}
            />
          </TabsContent>

          <TabsContent value="payments">
            <PaymentSchedule 
              contract={contract}
              milestones={milestones}
              view={userView}
            />
          </TabsContent>

          <TabsContent value="time">
            <Card className="p-6 border border-border/50">
              <div className="text-center py-8">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Time Tracking
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Track hours, submit timesheets, and manage approvals
                </p>
                <Button onClick={() => navigate(`/contracts/${contractId}/time-tracking`)}>
                  <Clock className="h-4 w-4 mr-2" />
                  Open Time Tracking
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            <Card className="p-6 border border-border/50">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Contract Documents</h3>
                <ContractDocumentUpload contractId={contractId!} />
              </div>
              <ContractDocumentsList contractId={contractId!} />
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modals and Drawers */}
        {selectedMilestoneId && (
          <>
            <MilestoneRevisionModal
              open={revisionModalOpen}
              onOpenChange={setRevisionModalOpen}
              milestoneId={selectedMilestoneId}
              onRevisionRequested={handleRefreshMilestones}
            />
            <MilestoneFileUploadModal
              open={uploadModalOpen}
              onOpenChange={setUploadModalOpen}
              milestoneId={selectedMilestoneId}
              onUploadComplete={handleRefreshMilestones}
            />
            <MilestoneCommentsDrawer
              open={commentsDrawerOpen}
              onOpenChange={setCommentsDrawerOpen}
              milestoneId={selectedMilestoneId}
            />
          </>
        )}
      </div>
    </AppLayout>
  );
}
