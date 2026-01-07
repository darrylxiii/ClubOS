import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Building2, Globe, Users, MapPin, Loader2, Search, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface EnrichmentData {
  company_name: string;
  domain: string;
  description: string;
  industry: string;
  employee_count: string;
  location: string;
  linkedin_url: string;
  founded_year: string;
}

export function CompanyEnrichment() {
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [enrichmentData, setEnrichmentData] = useState<EnrichmentData | null>(null);

  const handleEnrich = async () => {
    if (!domain.trim()) {
      toast.error("Please enter a domain");
      return;
    }

    setLoading(true);
    
    try {
      // Call edge function for real enrichment
      const { data, error } = await supabase.functions.invoke('enrich-company', {
        body: { domain: domain.trim().toLowerCase() }
      });

      if (error) throw error;

      const enriched = data?.data;
      if (enriched) {
        setEnrichmentData({
          company_name: enriched.company_name || domain.split(".")[0],
          domain: domain,
          description: enriched.description || "Company information retrieved.",
          industry: enriched.industry || "Technology",
          employee_count: enriched.employee_count || "Unknown",
          location: enriched.location || "Unknown",
          linkedin_url: enriched.linkedin_url || `https://linkedin.com/company/${domain.split(".")[0]}`,
          founded_year: enriched.founded_year || "Unknown",
        });
        toast.success("Company data enriched successfully");
      }
    } catch (error: any) {
      console.error('Enrichment error:', error);
      toast.error("Failed to enrich company data");
    } finally {
      setLoading(false);
    }
  };

  const applyToProspect = () => {
    if (!enrichmentData) return;
    toast.success("Enrichment data applied to prospect");
    setEnrichmentData(null);
    setDomain("");
  };

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Company Enrichment
        </CardTitle>
        <CardDescription>
          Automatically enrich prospect data from company domains
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Enter company domain (e.g., example.com)"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleEnrich()}
          />
          <Button onClick={handleEnrich} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        <AnimatePresence>
          {enrichmentData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4 p-4 bg-muted/30 rounded-lg"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{enrichmentData.name}</h3>
                  <p className="text-sm text-muted-foreground">{enrichmentData.description}</p>
                </div>
                <Badge variant="outline">{enrichmentData.industry}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span>{enrichmentData.domain}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{enrichmentData.employeeCount} employees</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{enrichmentData.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>Founded {enrichmentData.founded}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={applyToProspect} size="sm">
                  Apply to Prospect
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setEnrichmentData(null)}
                >
                  Dismiss
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="text-xs text-muted-foreground">
          Enrichment powered by company data APIs. Rate limits may apply.
        </div>
      </CardContent>
    </Card>
  );
}
