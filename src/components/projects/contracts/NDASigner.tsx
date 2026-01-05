import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { FileSignature, Shield } from "lucide-react";
import { toast } from "sonner";

interface NDASIgnerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string;
  counterpartyName: string;
  onSigned?: () => void;
}

export function NDASigner({ open, onOpenChange, contractId, counterpartyName, onSigned }: NDASIgnerProps) {
  const { user } = useAuth();
  const [agreed, setAgreed] = useState(false);
  const [signature, setSignature] = useState("");

  const { data: template } = useQuery({
    queryKey: ["nda-template"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contract_templates")
        .select("*")
        .eq("template_type", "nda")
        .eq("is_system", true)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user?.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const signMutation = useMutation({
    mutationFn: async () => {
      // Get IP address
      let ipAddress = "unknown";
      try {
        const ipResponse = await fetch("https://api.ipify.org?format=json");
        const ipData = await ipResponse.json();
        ipAddress = ipData.ip;
      } catch {}

      const { error } = await supabase.from("signed_documents").insert({
        contract_id: contractId,
        template_id: template?.id,
        signer_id: user?.id,
        signer_name: profile?.full_name || signature,
        signature_data: signature,
        ip_address: ipAddress,
        user_agent: navigator.userAgent,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("NDA signed successfully");
      onOpenChange(false);
      onSigned?.();
    },
    onError: (error: Error) => {
      toast.error("Failed to sign NDA", { description: error.message });
    },
  });

  const processedContent = template?.content
    ?.replace("{{effective_date}}", new Date().toLocaleDateString())
    ?.replace("{{party_a_name}}", profile?.full_name || "You")
    ?.replace("{{party_b_name}}", counterpartyName)
    ?.replace("{{term_years}}", "2")
    ?.replace("{{jurisdiction}}", "The Netherlands");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Non-Disclosure Agreement
          </DialogTitle>
          <DialogDescription>
            Please review and sign the NDA before proceeding
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] rounded-md border p-4 bg-muted/30">
          <pre className="whitespace-pre-wrap text-sm font-mono">{processedContent}</pre>
        </ScrollArea>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Checkbox
              id="agree"
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked as boolean)}
            />
            <label htmlFor="agree" className="text-sm leading-tight cursor-pointer">
              I have read and agree to the terms of this Non-Disclosure Agreement
            </label>
          </div>

          <div className="space-y-2">
            <Label>Type your full name to sign</Label>
            <Input
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder={profile?.full_name || "Your full legal name"}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!agreed || !signature.trim() || signMutation.isPending}
            onClick={() => signMutation.mutate()}
          >
            <FileSignature className="h-4 w-4 mr-2" />
            {signMutation.isPending ? "Signing..." : "Sign NDA"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
