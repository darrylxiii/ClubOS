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
import { Loader2, User, Building, Mail, Phone, Linkedin, DollarSign } from 'lucide-react';
import type { ProspectStage, CRMCampaign } from '@/types/crm-enterprise';

interface AddProspectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  campaigns?: CRMCampaign[];
  defaultStage?: ProspectStage;
}

export function AddProspectDialog({
  open,
  onOpenChange,
  onSuccess,
  campaigns = [],
  defaultStage = 'new',
}: AddProspectDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    job_title: '',
    company_name: '',
    company_size: '',
    linkedin_url: '',
    location: '',
    deal_value: '',
    campaign_id: '',
    source: 'manual',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.full_name || !formData.email) {
      toast.error('Name and email are required');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('crm_prospects')
        .insert({
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone || null,
          job_title: formData.job_title || null,
          company_name: formData.company_name || null,
          company_size: formData.company_size || null,
          linkedin_url: formData.linkedin_url || null,
          location: formData.location || null,
          deal_value: formData.deal_value ? parseFloat(formData.deal_value) : null,
          campaign_id: formData.campaign_id && formData.campaign_id !== 'none' ? formData.campaign_id : null,
          source: formData.source,
          notes: formData.notes || null,
          stage: defaultStage,
          lead_score: 50,
          owner_id: user?.id,
        });

      if (error) throw error;

      toast.success('Prospect added successfully');
      setFormData({
        full_name: '',
        email: '',
        phone: '',
        job_title: '',
        company_name: '',
        company_size: '',
        linkedin_url: '',
        location: '',
        deal_value: '',
        campaign_id: '',
        source: 'manual',
        notes: '',
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error adding prospect:', error);
      toast.error('Failed to add prospect');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-gradient-to-br from-card to-card/90 backdrop-blur-xl border-border/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Add New Prospect
          </DialogTitle>
          <DialogDescription>
            Add a new prospect to your pipeline
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Name */}
            <div className="col-span-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="John Smith"
                className="bg-muted/20 border-border/30"
                required
              />
            </div>

            {/* Email */}
            <div className="col-span-2">
              <Label htmlFor="email" className="flex items-center gap-1">
                <Mail className="w-3 h-3" /> Email *
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@company.com"
                className="bg-muted/20 border-border/30"
                required
              />
            </div>

            {/* Phone */}
            <div>
              <Label htmlFor="phone" className="flex items-center gap-1">
                <Phone className="w-3 h-3" /> Phone
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 234 567 8900"
                className="bg-muted/20 border-border/30"
              />
            </div>

            {/* Job Title */}
            <div>
              <Label htmlFor="job_title">Job Title</Label>
              <Input
                id="job_title"
                value={formData.job_title}
                onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                placeholder="VP of Engineering"
                className="bg-muted/20 border-border/30"
              />
            </div>

            {/* Company */}
            <div>
              <Label htmlFor="company_name" className="flex items-center gap-1">
                <Building className="w-3 h-3" /> Company
              </Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                placeholder="Acme Inc"
                className="bg-muted/20 border-border/30"
              />
            </div>

            {/* Company Size */}
            <div>
              <Label htmlFor="company_size">Company Size</Label>
              <Select
                value={formData.company_size}
                onValueChange={(value) => setFormData({ ...formData, company_size: value })}
              >
                <SelectTrigger className="bg-muted/20 border-border/30">
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-10">1-10</SelectItem>
                  <SelectItem value="11-50">11-50</SelectItem>
                  <SelectItem value="51-200">51-200</SelectItem>
                  <SelectItem value="201-500">201-500</SelectItem>
                  <SelectItem value="501-1000">501-1000</SelectItem>
                  <SelectItem value="1000+">1000+</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* LinkedIn */}
            <div className="col-span-2">
              <Label htmlFor="linkedin_url" className="flex items-center gap-1">
                <Linkedin className="w-3 h-3" /> LinkedIn URL
              </Label>
              <Input
                id="linkedin_url"
                value={formData.linkedin_url}
                onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                placeholder="https://linkedin.com/in/johnsmith"
                className="bg-muted/20 border-border/30"
              />
            </div>

            {/* Deal Value */}
            <div>
              <Label htmlFor="deal_value" className="flex items-center gap-1">
                <DollarSign className="w-3 h-3" /> Expected Deal Value
              </Label>
              <Input
                id="deal_value"
                type="number"
                value={formData.deal_value}
                onChange={(e) => setFormData({ ...formData, deal_value: e.target.value })}
                placeholder="50000"
                className="bg-muted/20 border-border/30"
              />
            </div>

            {/* Campaign */}
            <div>
              <Label htmlFor="campaign">Campaign</Label>
              <Select
                value={formData.campaign_id}
                onValueChange={(value) => setFormData({ ...formData, campaign_id: value })}
              >
                <SelectTrigger className="bg-muted/20 border-border/30">
                  <SelectValue placeholder="Select campaign" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {campaigns.map(campaign => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional notes about this prospect..."
                className="bg-muted/20 border-border/30 min-h-20"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Prospect
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
