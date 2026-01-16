import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DialogDescription } from '@/components/ui/dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  FileText,
  Download,
  Loader2,
  Eye,
  Calendar,
  DollarSign,
  User,
  Building2,
} from 'lucide-react';
import { useOfferLetterTemplates, useGenerateOfferLetter, OfferLetterData } from '@/hooks/useOfferLetterGeneration';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';

interface OfferLetterGeneratorProps {
  offerId: string;
  candidateName: string;
  jobTitle: string;
  companyName: string;
  companyId?: string;
  baseSalary: number;
  bonusPercentage: number;
  currency?: string;
  onGenerated?: (url: string) => void;
}

export function OfferLetterGenerator({
  offerId,
  candidateName,
  jobTitle,
  companyName,
  companyId,
  baseSalary,
  bonusPercentage,
  currency = 'EUR',
  onGenerated,
}: OfferLetterGeneratorProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [previewContent, setPreviewContent] = useState('');
  
  const [formData, setFormData] = useState<OfferLetterData>({
    candidate_name: candidateName,
    job_title: jobTitle,
    company_name: companyName,
    start_date: format(addDays(new Date(), 30), 'MMMM d, yyyy'),
    base_salary: baseSalary,
    bonus: bonusPercentage > 0 ? `${bonusPercentage}% annual performance bonus` : 'N/A',
    benefits: 'Health insurance, pension contribution, 25 days annual leave',
    probation_period: 90,
    expiry_date: format(addDays(new Date(), 7), 'MMMM d, yyyy'),
    signatory_name: '',
    signatory_title: 'Head of People',
    currency,
  });

  const { data: templates, isLoading: loadingTemplates } = useOfferLetterTemplates(companyId);
  const generateLetter = useGenerateOfferLetter();

  const handleGenerate = async () => {
    if (!selectedTemplateId) {
      toast.error('Please select a template');
      return;
    }

    try {
      const result = await generateLetter.mutateAsync({
        offerId,
        templateId: selectedTemplateId,
        data: formData,
      });

      if (result.url) {
        onGenerated?.(result.url);
      }

      // Download the generated PDF
      if (result.blob) {
        const url = URL.createObjectURL(result.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `offer-letter-${candidateName.replace(/\s+/g, '-')}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }

      setDialogOpen(false);
    } catch (_error) {
      console.error('Error generating letter:', _error);
    }
  };

  const handlePreview = () => {
    const template = templates?.find(t => t.id === selectedTemplateId);
    if (!template) return;

    let content = template.template_content;
    Object.entries(formData).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      content = content.replace(regex, String(value));
    });

    setPreviewContent(content);
    setPreviewOpen(true);
  };

  return (
    <>
      <Button
        variant="outline"
        className="gap-2"
        onClick={() => setDialogOpen(true)}
      >
        <FileText className="h-4 w-4" />
        Generate Offer Letter
      </Button>

      {/* Generator Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Generate Offer Letter
            </DialogTitle>
            <DialogDescription>
              Fill in the details to generate a professional offer letter
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Template Selection */}
            <div className="space-y-2">
              <Label>Template</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates?.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center gap-2">
                        {template.name}
                        {template.is_default && (
                          <Badge variant="secondary" className="text-xs">Default</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Candidate Details */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Candidate Details
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Candidate Name</Label>
                  <Input
                    value={formData.candidate_name}
                    onChange={(e) => setFormData({ ...formData, candidate_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Job Title</Label>
                  <Input
                    value={formData.job_title}
                    onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Compensation */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Compensation
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Base Salary ({currency})</Label>
                  <Input
                    type="number"
                    value={formData.base_salary}
                    onChange={(e) => setFormData({ ...formData, base_salary: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bonus</Label>
                  <Input
                    value={formData.bonus}
                    onChange={(e) => setFormData({ ...formData, bonus: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Benefits</Label>
                <Textarea
                  value={formData.benefits}
                  onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                  rows={2}
                />
              </div>
            </div>

            <Separator />

            {/* Dates */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Dates & Terms
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Offer Expiry Date</Label>
                  <Input
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Probation (days)</Label>
                  <Input
                    type="number"
                    value={formData.probation_period}
                    onChange={(e) => setFormData({ ...formData, probation_period: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Signatory */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Signatory
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={formData.signatory_name}
                    onChange={(e) => setFormData({ ...formData, signatory_name: e.target.value })}
                    placeholder="e.g., John Smith"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={formData.signatory_title}
                    onChange={(e) => setFormData({ ...formData, signatory_title: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handlePreview}
              disabled={!selectedTemplateId}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={generateLetter.isPending || !selectedTemplateId || !formData.signatory_name}
            >
              {generateLetter.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Generate PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Letter Preview</DialogTitle>
          </DialogHeader>
          <div className="p-6 bg-white text-black rounded-lg border whitespace-pre-wrap font-serif text-sm leading-relaxed">
            {previewContent}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
