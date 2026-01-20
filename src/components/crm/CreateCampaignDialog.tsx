import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Mail, Target, Calendar, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CreateCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type CampaignStep = 'details' | 'targeting' | 'schedule' | 'review';

export function CreateCampaignDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateCampaignDialogProps) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<CampaignStep>('details');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    campaign_type: 'cold',
    target_industry: '',
    target_company_size: '',
    target_region: '',
    sequence_steps: '5',
    daily_limit: '50',
    start_date: '',
  });

  const steps: { key: CampaignStep; label: string; icon: React.ReactNode }[] = [
    { key: 'details', label: 'Details', icon: <Mail className="w-4 h-4" /> },
    { key: 'targeting', label: 'Targeting', icon: <Target className="w-4 h-4" /> },
    { key: 'schedule', label: 'Schedule', icon: <Calendar className="w-4 h-4" /> },
    { key: 'review', label: 'Review', icon: <Users className="w-4 h-4" /> },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === step);

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setStep(steps[nextIndex].key);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setStep(steps[prevIndex].key);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      toast.error('Campaign name is required');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('crm_campaigns')
        .insert({
          name: formData.name,
          description: formData.description || null,
          campaign_type: formData.campaign_type,
          status: 'draft',
          source: 'manual',
          owner_id: user?.id,
          start_date: formData.start_date || null,
          settings: {
            target_industry: formData.target_industry,
            target_company_size: formData.target_company_size,
            target_region: formData.target_region,
            sequence_steps: parseInt(formData.sequence_steps),
            daily_limit: parseInt(formData.daily_limit),
          },
        });

      if (error) throw error;

      toast.success('Campaign created successfully');
      setFormData({
        name: '',
        description: '',
        campaign_type: 'cold',
        target_industry: '',
        target_company_size: '',
        target_region: '',
        sequence_steps: '5',
        daily_limit: '50',
        start_date: '',
      });
      setStep('details');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error('Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-gradient-to-br from-card to-card/90 backdrop-blur-xl border-border/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Create Campaign
          </DialogTitle>
          <DialogDescription>
            Set up a new outreach campaign
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-4">
          {steps.map((s, index) => (
            <div key={s.key} className="flex items-center">
              <button
                onClick={() => index <= currentStepIndex && setStep(s.key)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors ${
                  step === s.key
                    ? 'bg-primary text-primary-foreground'
                    : index < currentStepIndex
                    ? 'bg-primary/20 text-primary cursor-pointer'
                    : 'bg-muted/20 text-muted-foreground'
                }`}
              >
                {s.icon}
                <span className="hidden sm:inline">{s.label}</span>
              </button>
              {index < steps.length - 1 && (
                <div className={`w-8 h-px mx-2 ${
                  index < currentStepIndex ? 'bg-primary' : 'bg-muted/30'
                }`} />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            {step === 'details' && (
              <>
                <div>
                  <Label htmlFor="name">Campaign Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Q1 Enterprise Outreach"
                    className="bg-muted/20 border-border/30"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the campaign goals..."
                    className="bg-muted/20 border-border/30"
                  />
                </div>
                <div>
                  <Label htmlFor="campaign_type">Campaign Type</Label>
                  <Select
                    value={formData.campaign_type}
                    onValueChange={(value) => setFormData({ ...formData, campaign_type: value })}
                  >
                    <SelectTrigger className="bg-muted/20 border-border/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cold">Cold Outreach</SelectItem>
                      <SelectItem value="warm">Warm Follow-up</SelectItem>
                      <SelectItem value="nurture">Nurture Sequence</SelectItem>
                      <SelectItem value="reactivation">Re-activation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {step === 'targeting' && (
              <>
                <div>
                  <Label htmlFor="target_industry">Target Industry</Label>
                  <Select
                    value={formData.target_industry}
                    onValueChange={(value) => setFormData({ ...formData, target_industry: value })}
                  >
                    <SelectTrigger className="bg-muted/20 border-border/30">
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Industries</SelectItem>
                      <SelectItem value="technology">Technology</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="healthcare">Healthcare</SelectItem>
                      <SelectItem value="manufacturing">Manufacturing</SelectItem>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="consulting">Consulting</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="target_company_size">Company Size</Label>
                  <Select
                    value={formData.target_company_size}
                    onValueChange={(value) => setFormData({ ...formData, target_company_size: value })}
                  >
                    <SelectTrigger className="bg-muted/20 border-border/30">
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Sizes</SelectItem>
                      <SelectItem value="startup">Startup (1-50)</SelectItem>
                      <SelectItem value="smb">SMB (51-200)</SelectItem>
                      <SelectItem value="mid-market">Mid-Market (201-1000)</SelectItem>
                      <SelectItem value="enterprise">Enterprise (1000+)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="target_region">Target Region</Label>
                  <Select
                    value={formData.target_region}
                    onValueChange={(value) => setFormData({ ...formData, target_region: value })}
                  >
                    <SelectTrigger className="bg-muted/20 border-border/30">
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Regions</SelectItem>
                      <SelectItem value="europe">Europe</SelectItem>
                      <SelectItem value="north-america">North America</SelectItem>
                      <SelectItem value="uk">United Kingdom</SelectItem>
                      <SelectItem value="dach">DACH</SelectItem>
                      <SelectItem value="benelux">Benelux</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {step === 'schedule' && (
              <>
                <div>
                  <Label htmlFor="sequence_steps">Number of Email Steps</Label>
                  <Input
                    id="sequence_steps"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.sequence_steps}
                    onChange={(e) => setFormData({ ...formData, sequence_steps: e.target.value })}
                    className="bg-muted/20 border-border/30"
                  />
                </div>
                <div>
                  <Label htmlFor="daily_limit">Daily Send Limit</Label>
                  <Input
                    id="daily_limit"
                    type="number"
                    min="1"
                    max="200"
                    value={formData.daily_limit}
                    onChange={(e) => setFormData({ ...formData, daily_limit: e.target.value })}
                    className="bg-muted/20 border-border/30"
                  />
                </div>
                <div>
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="bg-muted/20 border-border/30"
                  />
                </div>
              </>
            )}

            {step === 'review' && (
              <div className="space-y-3 p-4 rounded-lg bg-muted/10 border border-border/30">
                <h4 className="font-medium">Campaign Summary</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Name:</span>
                  <span>{formData.name || '-'}</span>
                  <span className="text-muted-foreground">Type:</span>
                  <span className="capitalize">{formData.campaign_type}</span>
                  <span className="text-muted-foreground">Target Industry:</span>
                  <span className="capitalize">{formData.target_industry || 'All'}</span>
                  <span className="text-muted-foreground">Company Size:</span>
                  <span className="capitalize">{formData.target_company_size || 'All'}</span>
                  <span className="text-muted-foreground">Region:</span>
                  <span className="capitalize">{formData.target_region || 'All'}</span>
                  <span className="text-muted-foreground">Email Steps:</span>
                  <span>{formData.sequence_steps}</span>
                  <span className="text-muted-foreground">Daily Limit:</span>
                  <span>{formData.daily_limit}</span>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <DialogFooter className="gap-2">
          {step !== 'details' && (
            <Button type="button" variant="outline" onClick={handleBack}>
              Back
            </Button>
          )}
          {step !== 'review' ? (
            <Button type="button" onClick={handleNext}>
              Next
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Campaign
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
