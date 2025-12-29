import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { SignaturePad } from "@/components/contracts/SignaturePad";
import { MinimalHeader } from "@/components/MinimalHeader";
import { ProjectContract } from "@/types/projects";
import { ArrowLeft, FileText, Download, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function ContractSignaturePage() {
  const { contractId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);

  // Fetch contract details
  const { data: contract, isLoading } = useQuery({
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

  // Determine if user is freelancer or client
  const userRole = contract?.freelancer_id === user?.id ? 'freelancer' : 'client';
  const alreadySigned = userRole === 'freelancer' 
    ? contract?.signed_by_freelancer 
    : contract?.signed_by_client;

  // Sign contract mutation
  const signContract = useMutation({
    mutationFn: async () => {
      if (!signatureData || !contract) throw new Error("Missing signature or contract");

      // Get real IP address from headers or use fallback
      // Note: In production, this should be passed from the edge function
      // For now, we'll try to get it from the request if available
      let clientIp = 'unknown';
      try {
        // Attempt to get IP from various sources
        // In a real implementation, this would come from the server/edge function
        const forwarded = (window as any).__CLIENT_IP__;
        if (forwarded) {
          clientIp = forwarded;
        } else {
          // Fallback: Use a service to get IP (for development/testing)
          // In production, the edge function should provide this
          const ipResponse = await fetch('https://api.ipify.org?format=json').catch(() => null);
          if (ipResponse) {
            const ipData = await ipResponse.json();
            clientIp = ipData.ip || 'unknown';
          }
        }
      } catch (e) {
        logger.warn('Could not fetch IP address:', e);
        clientIp = 'unknown';
      }

      // Save signature
      const { error: sigError } = await supabase
        .from('contract_signatures' as any)
        .insert({
          contract_id: contract.id,
          signer_id: user!.id,
          signer_role: userRole,
          signature_image_url: signatureData,
          ip_address: clientIp,
          user_agent: navigator.userAgent,
          terms_version: 'v1.0',
          consent_text: 'I agree to the terms and conditions of this contract'
        });

      if (sigError) throw sigError;

      // Update contract signature status
      const updateData = userRole === 'freelancer'
        ? { signed_by_freelancer: true, freelancer_signed_at: new Date().toISOString() }
        : { signed_by_client: true, client_signed_at: new Date().toISOString() };

      const { error: updateError } = await supabase
        .from('project_contracts' as any)
        .update(updateData)
        .eq('id', contract.id);

      if (updateError) throw updateError;

      // Check if both parties have signed
      const { data: updatedContract } = await supabase
        .from('project_contracts' as any)
        .select('signed_by_freelancer, signed_by_client')
        .eq('id', contract.id)
        .single();

      // If both signed, activate contract
      if ((updatedContract as any)?.signed_by_freelancer && (updatedContract as any)?.signed_by_client) {
        await supabase
          .from('project_contracts' as any)
          .update({ contract_status: 'active' })
          .eq('id', contract.id);
      }
    },
    onSuccess: () => {
      toast.success("Contract signed successfully!");
      navigate(`/contracts/${contractId}`);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to sign contract");
    }
  });

  if (isLoading || !contract) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <MinimalHeader backPath={`/contracts/${contractId}`} />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (alreadySigned) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <MinimalHeader backPath={`/contracts/${contractId}`} />
        <div className="flex-1 p-6">
          <div className="max-w-3xl mx-auto">
            <Card className="p-8 text-center border border-border/50">
              <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Contract Already Signed
              </h2>
              <p className="text-muted-foreground mb-6">
                You have already signed this contract on{' '}
                {userRole === 'freelancer' 
                  ? format(new Date(contract.freelancer_signed_at!), 'MMMM d, yyyy')
                  : format(new Date(contract.client_signed_at!), 'MMMM d, yyyy')
                }
              </p>
              <Button onClick={() => navigate(`/contracts/${contractId}`)}>
                View Contract Details
              </Button>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MinimalHeader backPath={`/contracts/${contractId}`} />
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Sign Contract
          </h1>
          <p className="text-muted-foreground">
            Review the contract terms and add your signature to proceed
          </p>
        </div>

        {/* Contract summary */}
        <Card className="p-6 mb-6 border border-border/50">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Contract Summary
              </h2>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>Contract ID: {contract.id.slice(0, 8)}</div>
                <div>Type: {contract.contract_type}</div>
                {contract.start_date && contract.end_date && (
                  <div>
                    Duration: {format(new Date(contract.start_date), 'MMM d')} - {' '}
                    {format(new Date(contract.end_date), 'MMM d, yyyy')}
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground mb-1">Total Value</div>
              <div className="text-2xl font-bold text-foreground">
                €{contract.total_budget?.toLocaleString()}
              </div>
            </div>
          </div>

          {contract.contract_document_url && (
            <Button variant="outline" className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Download Full Contract PDF
            </Button>
          )}
        </Card>

        {/* Key terms */}
        <Card className="p-6 mb-6 border border-border/50">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Key Terms
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <FileText className="h-4 w-4 text-primary mt-0.5" />
              <div>
                <div className="font-medium text-foreground">Payment Schedule</div>
                <div className="text-muted-foreground">
                  {contract.payment_schedule || 'Milestone-based'}
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <FileText className="h-4 w-4 text-primary mt-0.5" />
              <div>
                <div className="font-medium text-foreground">Platform Fee</div>
                <div className="text-muted-foreground">
                  {contract.platform_fee_percentage}% (€{((contract.total_budget || 0) * (contract.platform_fee_percentage || 12) / 100).toLocaleString()})
                </div>
              </div>
            </div>
            {contract.escrow_enabled && (
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-primary mt-0.5" />
                <div>
                  <div className="font-medium text-foreground">Escrow Protection</div>
                  <div className="text-muted-foreground">
                    Funds held securely until milestone approval
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Signature section */}
        <SignaturePad 
          onSave={setSignatureData}
          disabled={signContract.isPending}
        />

        {/* Terms agreement */}
        <Card className="p-6 mt-6 border border-border/50">
          <div className="flex items-start gap-3 mb-6">
            <Checkbox 
              id="terms"
              checked={agreedToTerms}
              onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
              disabled={signContract.isPending}
            />
            <label 
              htmlFor="terms" 
              className="text-sm text-muted-foreground leading-relaxed cursor-pointer"
            >
              I have read and agree to the terms and conditions of this contract. 
              I understand that my signature is legally binding and that I am entering 
              into a contractual agreement. I authorize The Quantum Club to process 
              payments according to the milestone schedule outlined in this contract.
            </label>
          </div>

          <Button 
            className="w-full"
            size="lg"
            disabled={!agreedToTerms || !signatureData || signContract.isPending}
            onClick={() => signContract.mutate()}
          >
            {signContract.isPending ? (
              "Signing Contract..."
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Sign Contract
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center mt-4">
            By signing, you agree to the{' '}
            <a href="/terms" className="text-primary hover:underline">Terms of Service</a>
            {' '}and{' '}
            <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>
          </p>
        </Card>
        </div>
      </div>
    </div>
  );
}
