import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const GENERIC_DOMAINS = [
  'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com',
  'icloud.com', 'live.com', 'msn.com', 'protonmail.com',
  'aol.com', 'zoho.com', 'mail.com', 'yandex.com',
];

export const provisionSchema = z.object({
  // Step 1: Contact
  fullName: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name is too long'),
  email: z
    .string()
    .trim()
    .email('Enter a valid email address')
    .max(255, 'Email is too long'),
  phoneNumber: z.string().optional().default(''),
  linkedinUrl: z.string().url('Enter a valid URL').optional().or(z.literal('')),
  markEmailVerified: z.boolean().default(true),
  markPhoneVerified: z.boolean().default(false),

  // Step 2: Company
  companyMode: z.enum(['existing', 'new']).default('new'),
  companyId: z.string().optional().default(''),
  companyName: z.string().optional().default(''),
  companyDomain: z.string().optional().default(''),
  companyRole: z.enum(['owner', 'admin', 'recruiter', 'member']).default('owner'),
  industry: z.string().optional().default(''),
  companySize: z.string().optional().default(''),
  websiteUrl: z.string().url('Enter a valid URL').optional().or(z.literal('')),
  // Fee structure
  feeType: z.enum(['percentage', 'fixed', 'hybrid']).default('percentage'),
  placementFeePercentage: z.coerce.number().min(0).max(100).optional(),
  placementFeeFixed: z.coerce.number().min(0).optional(),
  defaultPaymentTermsDays: z.coerce.number().min(0).max(365).optional(),
  estimatedRolesPerYear: z.string().optional().default(''),
  // Domain auto-provisioning
  enableDomainAutoProvisioning: z.boolean().default(false),
  domainDefaultRole: z.string().default('member'),
  requireDomainApproval: z.boolean().default(true),

  // Step 3: Access
  provisionMethod: z.enum(['magic_link', 'password', 'oauth_only']).default('magic_link'),
  temporaryPassword: z.string().optional().default(''),
  welcomeMessage: z.string().max(500, 'Message is too long').optional().default(''),
  assignedStrategistId: z.string().optional().default(''),

  // Step 4: Review
  agreedNda: z.boolean().default(false),
}).refine(
  (data) => {
    if (data.companyMode === 'new' && (!data.companyName || data.companyName.trim().length < 2)) {
      return false;
    }
    return true;
  },
  { message: 'Company name must be at least 2 characters', path: ['companyName'] }
).refine(
  (data) => {
    if (data.companyMode === 'existing' && !data.companyId) {
      return false;
    }
    return true;
  },
  { message: 'Please select a company', path: ['companyId'] }
).refine(
  (data) => {
    if (data.provisionMethod === 'password') {
      return data.temporaryPassword && data.temporaryPassword.length >= 12;
    }
    return true;
  },
  { message: 'Password must be at least 12 characters', path: ['temporaryPassword'] }
);

export type ProvisionFormData = z.infer<typeof provisionSchema>;

export interface Strategist {
  id: string;
  full_name: string | null;
  email: string;
}

export interface CompanyOption {
  id: string;
  name: string;
  slug: string;
}

export interface PrefillData {
  email?: string;
  fullName?: string;
  companyName?: string;
  phoneNumber?: string;
  industry?: string;
  companySize?: string;
  websiteUrl?: string;
  linkedinUrl?: string;
  estimatedRolesPerYear?: string;
}

export const INDUSTRIES = [
  'Technology', 'Finance', 'Healthcare', 'E-commerce', 'SaaS',
  'Consulting', 'Manufacturing', 'Media', 'Education', 'Legal',
  'Energy', 'Real Estate', 'Logistics', 'Other',
];

export const COMPANY_SIZES = [
  '1-10', '11-50', '51-200', '201-500', '501-1000', '1000+',
];

export function useProvisionForm(prefillData?: PrefillData) {
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [strategists, setStrategists] = useState<Strategist[]>([]);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);

  const form = useForm<ProvisionFormData>({
    resolver: zodResolver(provisionSchema),
    defaultValues: {
      fullName: prefillData?.fullName || '',
      email: prefillData?.email || '',
      phoneNumber: prefillData?.phoneNumber || '',
      linkedinUrl: prefillData?.linkedinUrl || '',
      markEmailVerified: true,
      markPhoneVerified: false,
      companyMode: 'new',
      companyId: '',
      companyName: prefillData?.companyName || '',
      companyDomain: '',
      companyRole: 'owner',
      industry: prefillData?.industry || '',
      companySize: prefillData?.companySize || '',
      websiteUrl: prefillData?.websiteUrl || '',
      feeType: 'percentage',
      placementFeePercentage: 20,
      defaultPaymentTermsDays: 30,
      estimatedRolesPerYear: prefillData?.estimatedRolesPerYear || '',
      enableDomainAutoProvisioning: false,
      domainDefaultRole: 'member',
      requireDomainApproval: true,
      provisionMethod: 'magic_link',
      temporaryPassword: '',
      welcomeMessage: '',
      assignedStrategistId: '',
      agreedNda: false,
    },
    mode: 'onBlur',
  });

  // Extract domain from email
  const watchEmail = form.watch('email');
  useEffect(() => {
    if (watchEmail && watchEmail.includes('@')) {
      const domain = watchEmail.split('@')[1];
      if (domain && !GENERIC_DOMAINS.includes(domain.toLowerCase())) {
        form.setValue('companyDomain', domain.toLowerCase());
      }
    }
  }, [watchEmail, form]);

  // Load companies
  const loadCompanies = useCallback(async () => {
    const { data } = await supabase
      .from('companies')
      .select('id, name, slug')
      .eq('is_active', true)
      .order('name');
    setCompanies(data || []);
  }, []);

  // Load strategists
  const loadStrategists = useCallback(async () => {
    const { data } = await supabase
      .from('user_roles')
      .select('user_id, profiles!inner(id, full_name, email)')
      .eq('role', 'strategist');
    if (data) {
      setStrategists(
        data.map((d: any) => ({
          id: d.user_id,
          full_name: d.profiles?.full_name || null,
          email: d.profiles?.email || '',
        }))
      );
    }
  }, []);

  // Check for duplicate email
  const checkDuplicate = useCallback(async (email: string) => {
    if (!email || !email.includes('@')) {
      setDuplicateWarning(null);
      return;
    }
    setIsCheckingDuplicate(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();
      if (data) {
        setDuplicateWarning(`Already registered: ${data.full_name || email}`);
      } else {
        setDuplicateWarning(null);
      }
    } catch {
      setDuplicateWarning(null);
    } finally {
      setIsCheckingDuplicate(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    loadCompanies();
    loadStrategists();
  }, [loadCompanies, loadStrategists]);

  // Apply prefill
  useEffect(() => {
    if (prefillData) {
      const updates: Partial<ProvisionFormData> = {};
      if (prefillData.email) updates.email = prefillData.email;
      if (prefillData.fullName) updates.fullName = prefillData.fullName;
      if (prefillData.companyName) updates.companyName = prefillData.companyName;
      if (prefillData.phoneNumber) updates.phoneNumber = prefillData.phoneNumber;
      if (prefillData.industry) updates.industry = prefillData.industry;
      if (prefillData.companySize) updates.companySize = prefillData.companySize;
      if (prefillData.websiteUrl) updates.websiteUrl = prefillData.websiteUrl;
      if (prefillData.linkedinUrl) updates.linkedinUrl = prefillData.linkedinUrl;
      if (prefillData.estimatedRolesPerYear) updates.estimatedRolesPerYear = prefillData.estimatedRolesPerYear;
      Object.entries(updates).forEach(([key, value]) => {
        form.setValue(key as keyof ProvisionFormData, value as any);
      });
    }
  }, [prefillData, form]);

  const resetForm = useCallback(() => {
    form.reset();
    setDuplicateWarning(null);
  }, [form]);

  const isDirty = form.formState.isDirty;

  return {
    form,
    companies,
    strategists,
    duplicateWarning,
    isCheckingDuplicate,
    checkDuplicate,
    resetForm,
    isDirty,
    loadCompanies,
  };
}
