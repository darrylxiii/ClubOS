import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { FileText, Search, Download, Send } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";

export default function LegalAgreementsPage() {
  const [agreements, setAgreements] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [agreementsRes, templatesRes] = await Promise.all([
        supabase.from("legal_agreements").select("*").order("created_at", { ascending: false }),
        supabase.from("legal_agreement_templates").select("*"),
      ]);

      if (agreementsRes.error) throw agreementsRes.error;
      if (templatesRes.error) throw templatesRes.error;

      setAgreements(agreementsRes.data || []);
      setTemplates(templatesRes.data || []);
    } catch (error) {
      console.error("Error loading agreements:", error);
      toast({
        title: "Error",
        description: "Failed to load legal agreements",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: "bg-gray-500/10 text-gray-500 border-gray-500/20",
      pending_signature: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      active: "bg-green-500/10 text-green-500 border-green-500/20",
      expired: "bg-red-500/10 text-red-500 border-red-500/20",
      terminated: "bg-red-500/10 text-red-500 border-red-500/20",
    };

    return <Badge className={styles[status as keyof typeof styles]}>{status.replace("_", " ")}</Badge>;
  };

  return (
    <AppLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Legal Agreements</h1>
            <p className="text-muted-foreground mt-1">
              Manage DPAs, BAAs, and other legal documents with e-signature workflow
            </p>
          </div>
          <Button>
            <FileText className="h-4 w-4 mr-2" />
            Create from Template
          </Button>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search agreements..." className="pl-10" />
            </div>
          </CardContent>
        </Card>

        {/* Agreements List */}
        <div className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Loading agreements...
              </CardContent>
            </Card>
          ) : agreements.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No agreements found. Create your first agreement from a template.
              </CardContent>
            </Card>
          ) : (
            agreements.map((agreement) => (
              <Card key={agreement.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{agreement.agreement_type}</CardTitle>
                        {getStatusBadge(agreement.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Company: {agreement.company_name || "N/A"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                      {agreement.status === "draft" && (
                        <Button size="sm">
                          <Send className="h-4 w-4 mr-1" />
                          Send for Signature
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Created</p>
                      <p className="font-medium text-foreground">
                        {new Date(agreement.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Effective Date</p>
                      <p className="font-medium text-foreground">
                        {agreement.effective_date
                          ? new Date(agreement.effective_date).toLocaleDateString()
                          : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Expiration Date</p>
                      <p className="font-medium text-foreground">
                        {agreement.expiration_date
                          ? new Date(agreement.expiration_date).toLocaleDateString()
                          : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Contact</p>
                      <p className="font-medium text-foreground">
                        {agreement.contact_email || "N/A"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
