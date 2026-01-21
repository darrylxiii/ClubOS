import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { 
  FileText, 
  User, 
  DollarSign, 
  Calendar,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Loader2
} from "lucide-react";

const WIZARD_STEPS = [
  { id: "type", label: "Contract Type", icon: FileText },
  { id: "freelancer", label: "Select Freelancer", icon: User },
  { id: "scope", label: "Scope & Deliverables", icon: FileText },
  { id: "budget", label: "Budget & Timeline", icon: DollarSign },
  { id: "review", label: "Review & Create", icon: CheckCircle },
];

interface Milestone {
  title: string;
  description: string;
  amount: number;
  dueDate: string;
}

export default function CreateContractPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  
  // Form state
  const [contractType, setContractType] = useState<'fixed' | 'hourly' | 'milestone'>('milestone');
  const [selectedFreelancer, setSelectedFreelancer] = useState<string | null>(null);
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [totalBudget, setTotalBudget] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [milestones, setMilestones] = useState<Milestone[]>([
    { title: "", description: "", amount: 0, dueDate: "" }
  ]);

  // Fetch user's company
  const { data: profile } = useQuery({
    queryKey: ['profile-company', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id
  });

  // Fetch available freelancers (from previous contracts or applications)
  const { data: freelancers = [] } = useQuery({
    queryKey: ['available-freelancers', profile?.company_id],
    queryFn: async () => {
      // Get freelancers from previous contracts or approved applications
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .limit(20);
      return data || [];
    },
    enabled: !!profile?.company_id
  });

  // Create contract mutation
  const createContract = useMutation({
    mutationFn: async () => {
      if (!profile?.company_id || !selectedFreelancer) {
        throw new Error('Missing required data');
      }

      // Create the contract
      const { data: contract, error: contractError } = await supabase
        .from('project_contracts')
        .insert([{
          project_title: projectTitle || 'Untitled Contract',
          freelancer_id: selectedFreelancer,
          client_id: user?.id,
          company_id: profile.company_id,
          estimated_total: parseFloat(totalBudget) || 0,
          start_date: startDate || null,
          end_date: endDate || null,
          status: 'pending_signature',
          contract_terms: projectDescription,
          project_description: projectDescription,
          version: 1
        }])
        .select()
        .single();

      if (contractError) throw contractError;

      // Create milestones
      if (milestones.length > 0 && contractType === 'milestone') {
        const milestonesData = milestones.map((m, index) => ({
          contract_id: contract.id,
          milestone_number: index + 1,
          title: m.title,
          description: m.description,
          amount: m.amount,
          due_date: m.dueDate || null,
          status: 'pending' as const
        }));

        const { error: milestonesError } = await supabase
          .from('project_milestones')
          .insert(milestonesData);

        if (milestonesError) throw milestonesError;
      }

      return contract;
    },
    onSuccess: (contract) => {
      toast.success('Contract created successfully');
      navigate(`/contracts/${contract.id}`);
    },
    onError: (error) => {
      toast.error('Failed to create contract: ' + error.message);
    }
  });

  const progress = ((currentStep + 1) / WIZARD_STEPS.length) * 100;

  const canProceed = () => {
    switch (currentStep) {
      case 0: return contractType !== null;
      case 1: return selectedFreelancer !== null;
      case 2: return projectTitle.length > 0;
      case 3: return parseFloat(totalBudget) > 0;
      case 4: return true;
      default: return false;
    }
  };

  const addMilestone = () => {
    setMilestones([...milestones, { title: "", description: "", amount: 0, dueDate: "" }]);
  };

  const removeMilestone = (index: number) => {
    if (milestones.length > 1) {
      setMilestones(milestones.filter((_, i) => i !== index));
    }
  };

  const updateMilestone = (index: number, field: keyof Milestone, value: string | number) => {
    const updated = [...milestones];
    updated[index] = { ...updated[index], [field]: value };
    setMilestones(updated);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/partner/contracts')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Create Contract</h1>
            <p className="text-muted-foreground">
              Set up a new freelance contract
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {WIZARD_STEPS.map((step, index) => (
              <div 
                key={step.id}
                className={`flex items-center gap-2 ${
                  index <= currentStep ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <step.icon className="h-4 w-4" />
                <span className="text-sm hidden md:inline">{step.label}</span>
              </div>
            ))}
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Content */}
        <Card className="mb-6">
          <CardContent className="p-6">
            {/* Step 0: Contract Type */}
            {currentStep === 0 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-2">Select Contract Type</h2>
                  <p className="text-muted-foreground">
                    Choose how you want to structure payments for this contract
                  </p>
                </div>

                <RadioGroup 
                  value={contractType} 
                  onValueChange={(v) => setContractType(v as any)}
                  className="grid grid-cols-1 md:grid-cols-3 gap-4"
                >
                  <Label 
                    htmlFor="milestone"
                    className={`flex flex-col p-4 border rounded-lg cursor-pointer transition-colors ${
                      contractType === 'milestone' ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                  >
                    <RadioGroupItem value="milestone" id="milestone" className="sr-only" />
                    <div className="font-medium mb-1">Milestone-Based</div>
                    <div className="text-sm text-muted-foreground">
                      Pay upon completion of specific deliverables
                    </div>
                  </Label>

                  <Label 
                    htmlFor="fixed"
                    className={`flex flex-col p-4 border rounded-lg cursor-pointer transition-colors ${
                      contractType === 'fixed' ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                  >
                    <RadioGroupItem value="fixed" id="fixed" className="sr-only" />
                    <div className="font-medium mb-1">Fixed Price</div>
                    <div className="text-sm text-muted-foreground">
                      Single payment for the entire project
                    </div>
                  </Label>

                  <Label 
                    htmlFor="hourly"
                    className={`flex flex-col p-4 border rounded-lg cursor-pointer transition-colors ${
                      contractType === 'hourly' ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                  >
                    <RadioGroupItem value="hourly" id="hourly" className="sr-only" />
                    <div className="font-medium mb-1">Hourly Rate</div>
                    <div className="text-sm text-muted-foreground">
                      Pay based on hours worked
                    </div>
                  </Label>
                </RadioGroup>
              </div>
            )}

            {/* Step 1: Select Freelancer */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-2">Select Freelancer</h2>
                  <p className="text-muted-foreground">
                    Choose the freelancer for this contract
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {freelancers.map((freelancer) => (
                    <div
                      key={freelancer.id}
                      onClick={() => setSelectedFreelancer(freelancer.id)}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedFreelancer === freelancer.id 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          {freelancer.avatar_url ? (
                            <img 
                              src={freelancer.avatar_url} 
                              alt="" 
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <User className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium">
                            {freelancer.full_name || 'Unknown'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {freelancer.email || ''}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Scope & Deliverables */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-2">Scope & Deliverables</h2>
                  <p className="text-muted-foreground">
                    Define the project scope and expected deliverables
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Project Title</Label>
                    <Input
                      id="title"
                      value={projectTitle}
                      onChange={(e) => setProjectTitle(e.target.value)}
                      placeholder="e.g., Website Redesign"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Project Description</Label>
                    <Textarea
                      id="description"
                      value={projectDescription}
                      onChange={(e) => setProjectDescription(e.target.value)}
                      placeholder="Describe the project scope, requirements, and expected outcomes..."
                      rows={6}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Budget & Timeline */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-2">Budget & Timeline</h2>
                  <p className="text-muted-foreground">
                    Set the budget and project timeline
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="budget">Total Budget (EUR)</Label>
                    <Input
                      id="budget"
                      type="number"
                      value={totalBudget}
                      onChange={(e) => setTotalBudget(e.target.value)}
                      placeholder="5000"
                    />
                  </div>

                  <div>
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>

                {contractType === 'milestone' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Milestones</Label>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={addMilestone}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Milestone
                      </Button>
                    </div>

                    {milestones.map((milestone, index) => (
                      <Card key={index} className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label>Title</Label>
                              <Input
                                value={milestone.title}
                                onChange={(e) => updateMilestone(index, 'title', e.target.value)}
                                placeholder="Milestone title"
                              />
                            </div>
                            <div>
                              <Label>Amount (EUR)</Label>
                              <Input
                                type="number"
                                value={milestone.amount || ''}
                                onChange={(e) => updateMilestone(index, 'amount', parseFloat(e.target.value) || 0)}
                                placeholder="1000"
                              />
                            </div>
                            <div>
                              <Label>Description</Label>
                              <Input
                                value={milestone.description}
                                onChange={(e) => updateMilestone(index, 'description', e.target.value)}
                                placeholder="What will be delivered"
                              />
                            </div>
                            <div>
                              <Label>Due Date</Label>
                              <Input
                                type="date"
                                value={milestone.dueDate}
                                onChange={(e) => updateMilestone(index, 'dueDate', e.target.value)}
                              />
                            </div>
                          </div>
                          {milestones.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeMilestone(index)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </Card>
                    ))}

                    <div className="text-right text-sm text-muted-foreground">
                      Total milestones: {formatCurrency(milestones.reduce((sum, m) => sum + m.amount, 0))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Review */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-2">Review Contract</h2>
                  <p className="text-muted-foreground">
                    Review the contract details before creating
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <div className="text-sm text-muted-foreground">Contract Type</div>
                    <div className="font-medium capitalize">{contractType}</div>
                  </div>

                  <div className="p-4 bg-muted/30 rounded-lg">
                    <div className="text-sm text-muted-foreground">Project</div>
                    <div className="font-medium">{projectTitle}</div>
                    {projectDescription && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {projectDescription.substring(0, 200)}
                        {projectDescription.length > 200 ? '...' : ''}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <div className="text-sm text-muted-foreground">Total Budget</div>
                      <div className="font-medium">{formatCurrency(parseFloat(totalBudget) || 0)}</div>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <div className="text-sm text-muted-foreground">Timeline</div>
                      <div className="font-medium">
                        {startDate && endDate 
                          ? `${startDate} to ${endDate}`
                          : 'Not specified'
                        }
                      </div>
                    </div>
                  </div>

                  {contractType === 'milestone' && milestones.length > 0 && (
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <div className="text-sm text-muted-foreground mb-2">Milestones</div>
                      <div className="space-y-2">
                        {milestones.filter(m => m.title).map((m, i) => (
                          <div key={i} className="flex justify-between">
                            <span>{m.title}</span>
                            <span className="font-medium">{formatCurrency(m.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {currentStep < WIZARD_STEPS.length - 1 ? (
            <Button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={!canProceed()}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={() => createContract.mutate()}
              disabled={createContract.isPending}
            >
              {createContract.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Create Contract
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
