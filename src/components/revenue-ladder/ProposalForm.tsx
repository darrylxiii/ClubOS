import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wrench, Heart, Building2, Banknote, 
  ChevronRight, ChevronLeft, Zap, Target, Users, Sparkles,
  Send, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CFOSafetyGuard } from './CFOSafetyGuard';
import { useCreateProposal } from '@/hooks/useRewardProposals';

interface ProposalFormProps {
  milestoneId: string;
  milestoneName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const categories = [
  {
    id: 'enablement',
    name: 'Team Enablement',
    description: 'Better tooling, automation, training, workspace upgrades',
    icon: Wrench,
    cfoBias: 'high',
    color: 'text-success',
    bg: 'bg-success/10',
    border: 'border-success/30',
  },
  {
    id: 'experience',
    name: 'Team Experience',
    description: 'Retreats, shared experiences, travel, team events',
    icon: Heart,
    cfoBias: 'medium',
    color: 'text-warning',
    bg: 'bg-warning/10',
    border: 'border-warning/30',
  },
  {
    id: 'assets',
    name: 'Company Assets',
    description: 'Strategic investments, brand assets, infrastructure',
    icon: Building2,
    cfoBias: 'requires justification',
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/30',
  },
  {
    id: 'cash',
    name: 'Cash / Bonuses',
    description: 'Team bonuses, performance pools',
    icon: Banknote,
    cfoBias: 'controlled',
    color: 'text-destructive',
    bg: 'bg-destructive/10',
    border: 'border-destructive/30',
  },
];

const impactTypes = [
  { id: 'speed', label: 'Speed', icon: Zap, description: 'Faster execution' },
  { id: 'quality', label: 'Quality', icon: Target, description: 'Better outcomes' },
  { id: 'retention', label: 'Retention', icon: Users, description: 'Team loyalty' },
  { id: 'leverage', label: 'Leverage', icon: Sparkles, description: 'Scale impact' },
];

export function ProposalForm({ milestoneId, milestoneName, open, onOpenChange }: ProposalFormProps) {
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedCost, setEstimatedCost] = useState<number>(0);
  const [rationale, setRationale] = useState('');
  const [selectedImpacts, setSelectedImpacts] = useState<string[]>([]);

  const createProposal = useCreateProposal();

  const handleSubmit = async () => {
    await createProposal.mutateAsync({
      milestone_id: milestoneId,
      category,
      title,
      description,
      estimated_cost: estimatedCost,
      rationale,
      impact_type: selectedImpacts.length > 0 ? selectedImpacts : ['speed'],
    });
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setStep(1);
    setCategory('');
    setTitle('');
    setDescription('');
    setEstimatedCost(0);
    setRationale('');
    setSelectedImpacts([]);
  };

  const canProceed = () => {
    switch (step) {
      case 1: return category !== '';
      case 2: return title !== '' && description !== '' && estimatedCost > 0;
      case 3: return rationale !== '' && selectedImpacts.length > 0;
      default: return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Propose a Reward for {milestoneName}
          </DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center gap-2 my-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-label-sm font-medium transition-colors",
                step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                {s}
              </div>
              {s < 3 && (
                <div className={cn(
                  "flex-1 h-0.5 mx-2 transition-colors",
                  step > s ? "bg-primary" : "bg-muted"
                )} />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Category Selection */}
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label className="text-heading-xs">Choose Reward Category</Label>
                <p className="text-body-sm text-muted-foreground">
                  Select the type of reward you're proposing
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <Card
                      key={cat.id}
                      variant="interactive"
                      onClick={() => setCategory(cat.id)}
                      className={cn(
                        "p-4 cursor-pointer transition-all",
                        category === cat.id && `ring-2 ${cat.border} ${cat.bg}`
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn("p-2 rounded-lg", cat.bg)}>
                          <Icon className={cn("h-5 w-5", cat.color)} />
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="font-medium">{cat.name}</p>
                          <p className="text-label-sm text-muted-foreground">
                            {cat.description}
                          </p>
                          <Badge 
                            variant="outline" 
                            className={cn("text-label-xs capitalize", cat.border, cat.color)}
                          >
                            CFO: {cat.cfoBias}
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Step 2: Reward Details */}
          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Reward Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Team Offsite in Barcelona"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the reward in detail..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cost">Estimated Cost (€)</Label>
                  <Input
                    id="cost"
                    type="number"
                    value={estimatedCost || ''}
                    onChange={(e) => setEstimatedCost(Number(e.target.value))}
                    placeholder="5000"
                  />
                </div>
              </div>

              {/* CFO Safety Preview */}
              {estimatedCost > 0 && (
                <CFOSafetyGuard estimatedCost={estimatedCost} />
              )}
            </motion.div>
          )}

          {/* Step 3: Rationale & Impact */}
          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <Label>How does this improve...</Label>
                <p className="text-body-sm text-muted-foreground">
                  Select at least one impact type
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {impactTypes.map((impact) => {
                    const Icon = impact.icon;
                    const isSelected = selectedImpacts.includes(impact.id);
                    return (
                      <Card
                        key={impact.id}
                        variant="interactive"
                        onClick={() => {
                          setSelectedImpacts(prev =>
                            isSelected
                              ? prev.filter(i => i !== impact.id)
                              : [...prev, impact.id]
                          );
                        }}
                        className={cn(
                          "p-3 cursor-pointer",
                          isSelected && "ring-2 ring-primary bg-primary/5"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={cn(
                            "h-5 w-5",
                            isSelected ? "text-primary" : "text-muted-foreground"
                          )} />
                          <div>
                            <p className="font-medium">{impact.label}</p>
                            <p className="text-label-sm text-muted-foreground">
                              {impact.description}
                            </p>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rationale">Rationale</Label>
                <Textarea
                  id="rationale"
                  value={rationale}
                  onChange={(e) => setRationale(e.target.value)}
                  placeholder="Explain why this reward will help the team and company..."
                  rows={4}
                />
              </div>

              {/* Summary */}
              <Card variant="static" className="p-4 space-y-3 bg-muted/30">
                <p className="text-label-sm font-medium text-muted-foreground">Summary</p>
                <div className="space-y-2 text-body-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Category</span>
                    <span className="font-medium capitalize">{category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reward</span>
                    <span className="font-medium">{title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cost</span>
                    <span className="font-medium">€{estimatedCost.toLocaleString()}</span>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Button
            variant="ghost"
            onClick={() => step > 1 ? setStep(step - 1) : onOpenChange(false)}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {step > 1 ? 'Back' : 'Cancel'}
          </Button>

          {step < 3 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit} 
              disabled={!canProceed() || createProposal.isPending}
            >
              {createProposal.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Submit Proposal
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
