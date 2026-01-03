export interface InvoiceForReconciliation {
  id: string;
  moneybird_id: string;
  invoice_number: string | null;
  contact_name: string | null;
  contact_id: string | null;
  total_amount: number;
  paid_amount: number;
  unpaid_amount: number;
  state_normalized: string;
  invoice_date: string | null;
  due_date: string | null;
  currency: string;
  company_id: string | null;
  placement_fee_id: string | null;
  application_id: string | null;
  reconciliation_status: string | null;
  reconciliation_notes: string | null;
  invoice_type: string | null;
  variance_reason: string | null;
  variance_amount: number | null;
  reconciliation_confidence: string | null;
  requires_finance_review: boolean | null;
  payment_terms: string | null;
  raw_data: Record<string, unknown> | null;
}

export interface CompanyForReconciliation {
  id: string;
  name: string;
  industry: string | null;
  total_revenue: number | null;
  total_paid: number | null;
  total_outstanding: number | null;
  revenue_tier: string | null;
  payment_reliability_score: number | null;
  default_fee_percentage: number | null;
}

export interface PlacementFeeForReconciliation {
  id: string;
  application_id: string | null;
  company_id: string | null;
  candidate_name: string | null;
  job_title: string | null;
  fee_amount: number;
  fee_percentage: number | null;
  base_salary: number | null;
  hired_date: string | null;
  invoice_id: string | null;
  status: string;
}

export interface ReconciliationFormData {
  company_id: string;
  invoice_type: 'placement_fee' | 'retainer' | 'consulting' | 'credit_note' | 'other';
  placement_fee_id: string | null;
  variance_reason: string | null;
  variance_amount: number;
  payment_terms: 'net_14' | 'net_30' | 'net_60' | 'net_90' | 'immediate';
  reconciliation_notes: string;
  requires_finance_review: boolean;
}

export const INVOICE_TYPES = [
  { value: 'placement_fee', label: 'Placement Fee', description: 'Fee from a successful hire' },
  { value: 'retainer', label: 'Retainer', description: 'Recurring search retainer' },
  { value: 'consulting', label: 'Consulting', description: 'Advisory or consulting services' },
  { value: 'credit_note', label: 'Credit Note', description: 'Credit or refund' },
  { value: 'other', label: 'Other', description: 'Other invoice type' },
] as const;

export const PAYMENT_TERMS = [
  { value: 'immediate', label: 'Immediate', days: 0 },
  { value: 'net_14', label: 'Net 14', days: 14 },
  { value: 'net_30', label: 'Net 30', days: 30 },
  { value: 'net_60', label: 'Net 60', days: 60 },
  { value: 'net_90', label: 'Net 90', days: 90 },
] as const;

export const VARIANCE_REASONS = [
  { value: 'negotiated_discount', label: 'Negotiated Discount' },
  { value: 'partial_payment', label: 'Partial Payment' },
  { value: 'multiple_placements', label: 'Multiple Placements on Invoice' },
  { value: 'credit_applied', label: 'Credit Applied' },
  { value: 'currency_adjustment', label: 'Currency Adjustment' },
  { value: 'other', label: 'Other' },
] as const;
