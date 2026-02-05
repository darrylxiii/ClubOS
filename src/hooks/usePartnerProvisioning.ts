import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProvisionPartnerData {
  // Contact Information
  email: string;
  fullName: string;
  phoneNumber?: string;
  
  // Verification
  markEmailVerified: boolean;
  markPhoneVerified: boolean;
  
  // Company Configuration
  companyId?: string;
  companyName?: string;
  companyDomain?: string;
  companyRole: 'owner' | 'admin' | 'recruiter' | 'member';
  industry?: string;
  companySize?: string;
  
  // Authentication
  provisionMethod: 'magic_link' | 'password' | 'oauth_only';
  temporaryPassword?: string;
  
  // Domain Settings
  enableDomainAutoProvisioning?: boolean;
  domainDefaultRole?: string;
  requireDomainApproval?: boolean;
  
  // Welcome Experience
  welcomeMessage?: string;
  scheduleOnboardingCall?: boolean;
  assignedStrategistId?: string;
}

export interface ProvisionResult {
  success: boolean;
  user_id?: string;
  company_id?: string;
  company_slug?: string;
  invite_code?: string;
  magic_link?: string;
  welcome_email_sent?: boolean;
  message?: string;
  error?: string;
}

export const usePartnerProvisioning = () => {
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [lastResult, setLastResult] = useState<ProvisionResult | null>(null);

  const provisionPartner = async (data: ProvisionPartnerData): Promise<ProvisionResult> => {
    setIsProvisioning(true);
    
    try {
      const { data: result, error } = await supabase.functions.invoke('provision-partner', {
        body: data
      });

      if (error) {
        const errorResult: ProvisionResult = { 
          success: false, 
          error: error.message 
        };
        setLastResult(errorResult);
        toast.error(`Provisioning failed: ${error.message}`);
        return errorResult;
      }

      if (result?.error) {
        const errorResult: ProvisionResult = { 
          success: false, 
          error: result.error 
        };
        setLastResult(errorResult);
        toast.error(`Provisioning failed: ${result.error}`);
        return errorResult;
      }

      const successResult: ProvisionResult = {
        success: true,
        ...result
      };
      
      setLastResult(successResult);
      toast.success(`Partner ${data.fullName} provisioned successfully!`);
      
      return successResult;
    } catch (error) {
      const errorResult: ProvisionResult = { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
      setLastResult(errorResult);
      toast.error('Failed to provision partner');
      return errorResult;
    } finally {
      setIsProvisioning(false);
    }
  };

  const copyMagicLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast.success('Magic link copied to clipboard');
  };

  const resendWelcomeEmail = async (userId: string) => {
    // TODO: Implement resend functionality
    toast.info('Resend functionality coming soon');
  };

  return {
    provisionPartner,
    isProvisioning,
    lastResult,
    copyMagicLink,
    resendWelcomeEmail
  };
};
