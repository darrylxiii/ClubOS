import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { InvoiceDetailsStep } from "./InvoiceDetailsStep";
import { CompanyMatchStep } from "./CompanyMatchStep";
import { PlacementLinkStep } from "./PlacementLinkStep";
import { ReconciliationDataStep } from "./ReconciliationDataStep";
import { ReconciliationReviewStep } from "./ReconciliationReviewStep";
import { 
  InvoiceForReconciliation, 
  CompanyForReconciliation, 
  PlacementFeeForReconciliation,
  ReconciliationFormData 
} from "./types";

interface ReconciliationModalProps {
  invoice: InvoiceForReconciliation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STEPS = [
  { id: 'details', title: 'Invoice Details' },
  { id: 'company', title: 'Match Company' },
  { id: 'placement', title: 'Link Placement' },
  { id: 'data', title: 'Additional Data' },
  { id: 'review', title: 'Review & Confirm' },
];

export function ReconciliationModal({ invoice, open, onOpenChange }: ReconciliationModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedCompany, setSelectedCompany] = useState<CompanyForReconciliation | null>(null);
  const [selectedPlacement, setSelectedPlacement] = useState<PlacementFeeForReconciliation | null>(null);
  const [formData, setFormData] = useState<ReconciliationFormData>({
    company_id: '',
    invoice_type: 'placement_fee',
    placement_fee_id: null,
    variance_reason: null,
    variance_amount: 0,
    payment_terms: 'net_30',
    reconciliation_notes: '',
    requires_finance_review: false,
  });

  const queryClient = useQueryClient();

  // Reset state when modal opens with new invoice
  useEffect(() => {
    if (open && invoice) {
      setCurrentStep(0);
      setSelectedCompany(null);
      setSelectedPlacement(null);
      setFormData({
        company_id: invoice.company_id || '',
        invoice_type: (invoice.invoice_type as ReconciliationFormData['invoice_type']) || 'placement_fee',
        placement_fee_id: invoice.placement_fee_id || null,
        variance_reason: invoice.variance_reason || null,
        variance_amount: invoice.variance_amount || 0,
        payment_terms: (invoice.payment_terms as ReconciliationFormData['payment_terms']) || 'net_30',
        reconciliation_notes: invoice.reconciliation_notes || '',
        requires_finance_review: invoice.requires_finance_review || false,
      });
    }
  }, [open, invoice]);

  // Fetch companies
  const { data: companies } = useQuery({
    queryKey: ['companies-for-reconciliation-modal'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, industry, total_revenue, total_paid, total_outstanding, revenue_tier, payment_reliability_score')
        .order('name');
      if (error) throw error;
      return (data || []).map(c => ({ ...c, default_fee_percentage: null })) as CompanyForReconciliation[];
    },
    enabled: open,
  });

  // Fetch placement fees for selected company
  const { data: placementFees, isLoading: placementsLoading } = useQuery({
    queryKey: ['placement-fees-for-reconciliation', selectedCompany?.id],
    queryFn: async (): Promise<PlacementFeeForReconciliation[]> => {
      if (!selectedCompany?.id) return [];
      
      const { data, error } = await supabase
        .from('placement_fees')
        .select('id, application_id, partner_company_id, fee_amount, fee_percentage, candidate_salary, hired_date, invoice_id, status')
        .eq('partner_company_id', selectedCompany.id)
        .is('invoice_id', null)
        .order('hired_date', { ascending: false });

      if (error) throw error;
      
      // Fetch application details separately
      const appIds = (data || []).map(f => f.application_id).filter(Boolean) as string[];
      let appsMap: Record<string, { candidate_full_name: string; position: string }> = {};
      
      if (appIds.length > 0) {
        const { data: apps } = await supabase
          .from('applications')
          .select('id, candidate_full_name, position')
          .in('id', appIds);
        appsMap = (apps || []).reduce((acc, a) => ({ ...acc, [a.id]: a }), {});
      }
      
      return (data || []).map((fee) => ({
        id: fee.id,
        application_id: fee.application_id,
        company_id: fee.partner_company_id,
        candidate_name: fee.application_id ? appsMap[fee.application_id]?.candidate_full_name || 'Unknown' : 'Unknown',
        job_title: fee.application_id ? appsMap[fee.application_id]?.position || 'Unknown' : 'Unknown',
        fee_amount: fee.fee_amount || 0,
        fee_percentage: fee.fee_percentage,
        base_salary: fee.candidate_salary,
        hired_date: fee.hired_date,
        invoice_id: fee.invoice_id,
        status: fee.status || 'pending',
      }));
    },
    enabled: !!selectedCompany?.id && open,
  });

  // Submit reconciliation
  const reconcileMutation = useMutation({
    mutationFn: async () => {
      if (!invoice || !selectedCompany) throw new Error('Missing required data');

      const { data, error } = await supabase.functions.invoke('reconcile-invoices', {
        body: {
          action: 'comprehensive-link',
          invoice_id: invoice.id,
          company_id: selectedCompany.id,
          placement_fee_id: selectedPlacement?.id || null,
          invoice_type: formData.invoice_type,
          variance_reason: formData.variance_reason,
          variance_amount: formData.variance_amount,
          payment_terms: formData.payment_terms,
          reconciliation_notes: formData.reconciliation_notes,
          requires_finance_review: formData.requires_finance_review,
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Invoice reconciled successfully');
      queryClient.invalidateQueries({ queryKey: ['reconciliation-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['unmatched-invoice-count'] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`Reconciliation failed: ${error.message}`);
    },
  });

  const handleNext = () => {
    if (currentStep === 1 && !selectedCompany) {
      toast.error('Please select a company');
      return;
    }
    setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleCompanySelect = (company: CompanyForReconciliation) => {
    setSelectedCompany(company);
    setFormData(prev => ({ ...prev, company_id: company.id }));
    setSelectedPlacement(null); // Reset placement when company changes
  };

  const handlePlacementSelect = (placement: PlacementFeeForReconciliation | null) => {
    setSelectedPlacement(placement);
    setFormData(prev => ({ 
      ...prev, 
      placement_fee_id: placement?.id || null,
      // Calculate variance if placement selected
      variance_amount: placement 
        ? Math.abs((invoice?.total_amount || 0) - placement.fee_amount)
        : 0,
    }));
  };

  if (!invoice) return null;

  const canProceed = currentStep === 0 || (currentStep >= 1 && selectedCompany);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reconcile Invoice</DialogTitle>
          <DialogDescription>
            Link invoice {invoice.invoice_number} to a company and capture reconciliation data
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-6">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`
                flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                ${index === currentStep 
                  ? 'bg-primary text-primary-foreground' 
                  : index < currentStep 
                    ? 'bg-primary/20 text-primary' 
                    : 'bg-muted text-muted-foreground'}
              `}>
                {index + 1}
              </div>
              <span className={`ml-2 text-sm hidden sm:block ${
                index === currentStep ? 'font-medium' : 'text-muted-foreground'
              }`}>
                {step.title}
              </span>
              {index < STEPS.length - 1 && (
                <div className={`w-8 sm:w-16 h-px mx-2 ${
                  index < currentStep ? 'bg-primary' : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="min-h-[400px]">
          {currentStep === 0 && (
            <InvoiceDetailsStep invoice={invoice} />
          )}
          {currentStep === 1 && (
            <CompanyMatchStep
              invoice={invoice}
              companies={companies || []}
              selectedCompany={selectedCompany}
              onSelect={handleCompanySelect}
            />
          )}
          {currentStep === 2 && (
            <PlacementLinkStep
              invoice={invoice}
              placementFees={placementFees || []}
              selectedPlacement={selectedPlacement}
              onSelect={handlePlacementSelect}
              isLoading={placementsLoading}
            />
          )}
          {currentStep === 3 && (
            <ReconciliationDataStep
              invoice={invoice}
              selectedPlacement={selectedPlacement}
              formData={formData}
              onChange={setFormData}
            />
          )}
          {currentStep === 4 && (
            <ReconciliationReviewStep
              invoice={invoice}
              selectedCompany={selectedCompany}
              selectedPlacement={selectedPlacement}
              formData={formData}
            />
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {currentStep < STEPS.length - 1 ? (
            <Button onClick={handleNext} disabled={!canProceed}>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={() => reconcileMutation.mutate()}
              disabled={reconcileMutation.isPending || !selectedCompany}
            >
              {reconcileMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Confirm Reconciliation
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
