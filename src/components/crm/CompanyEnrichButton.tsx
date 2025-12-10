import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, Building, Globe, Users, MapPin, Briefcase, Check, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { CRMProspect } from '@/types/crm-enterprise';

interface EnrichedData {
  company_name?: string;
  company_domain?: string;
  industry?: string;
  company_size?: string;
  location?: string;
  country?: string;
  linkedin_url?: string;
  description?: string;
  founded_year?: number;
  employee_count?: string;
  funding_stage?: string;
  technologies?: string[];
}

interface CompanyEnrichButtonProps {
  prospect: CRMProspect;
  onEnriched?: (data: EnrichedData) => void;
}

export function CompanyEnrichButton({ prospect, onEnriched }: CompanyEnrichButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [enrichedData, setEnrichedData] = useState<EnrichedData | null>(null);

  const handleEnrich = async () => {
    if (!prospect.email && !prospect.company_domain) {
      toast.error('No email or domain to enrich from');
      return;
    }

    setLoading(true);
    try {
      // Extract domain from email if no domain set
      const domain = prospect.company_domain || prospect.email.split('@')[1];

      // Call enrichment edge function
      const { data, error } = await supabase.functions.invoke('enrich-prospect-company', {
        body: {
          prospect_id: prospect.id,
          domain,
          email: prospect.email,
          company_name: prospect.company_name,
        },
      });

      if (error) throw error;

      if (data?.enriched) {
        setEnrichedData(data.enriched);
        setShowPreview(true);
      } else {
        toast.info('No additional data found for this company');
      }
    } catch (err) {
      console.error('Enrichment error:', err);
      toast.error('Failed to enrich company data');
    } finally {
      setLoading(false);
    }
  };

  const applyEnrichment = async () => {
    if (!enrichedData) return;

    try {
      // Build update object only with changed fields
      const updates: Partial<CRMProspect> = {};
      
      if (enrichedData.company_name && enrichedData.company_name !== prospect.company_name) {
        updates.company_name = enrichedData.company_name;
      }
      if (enrichedData.company_domain && enrichedData.company_domain !== prospect.company_domain) {
        updates.company_domain = enrichedData.company_domain;
      }
      if (enrichedData.industry && enrichedData.industry !== prospect.industry) {
        updates.industry = enrichedData.industry;
      }
      if (enrichedData.company_size && enrichedData.company_size !== prospect.company_size) {
        updates.company_size = enrichedData.company_size;
      }
      if (enrichedData.location && enrichedData.location !== prospect.location) {
        updates.location = enrichedData.location;
      }
      if (enrichedData.country && enrichedData.country !== prospect.country) {
        updates.country = enrichedData.country;
      }
      if (enrichedData.linkedin_url && enrichedData.linkedin_url !== prospect.linkedin_url) {
        updates.linkedin_url = enrichedData.linkedin_url;
      }

      // Store extra data in custom_fields
      if (enrichedData.description || enrichedData.technologies || enrichedData.funding_stage) {
        updates.custom_fields = {
          ...prospect.custom_fields,
          enriched_description: enrichedData.description,
          enriched_technologies: enrichedData.technologies,
          enriched_funding_stage: enrichedData.funding_stage,
          enriched_founded_year: enrichedData.founded_year,
          enriched_at: new Date().toISOString(),
        };
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from('crm_prospects')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', prospect.id);

        if (error) throw error;

        toast.success('Company data enriched');
        onEnriched?.(enrichedData);
      }

      setShowPreview(false);
    } catch (err) {
      console.error('Apply enrichment error:', err);
      toast.error('Failed to apply enrichment');
    }
  };

  const EnrichmentField = ({ 
    label, 
    current, 
    enriched, 
    icon: Icon 
  }: { 
    label: string; 
    current?: string | null; 
    enriched?: string; 
    icon: typeof Building;
  }) => {
    if (!enriched || enriched === current) return null;
    
    return (
      <div className="flex items-start gap-3 py-2">
        <Icon className="w-4 h-4 text-muted-foreground mt-0.5" />
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          {current && (
            <p className="text-sm line-through text-muted-foreground/60">{current}</p>
          )}
          <p className="text-sm font-medium text-green-500">{enriched}</p>
        </div>
      </div>
    );
  };

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleEnrich}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Sparkles className="w-4 h-4 mr-2" />
        )}
        Enrich
      </Button>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Enrichment Preview
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-1 divide-y divide-border/30">
            <EnrichmentField 
              label="Company Name" 
              current={prospect.company_name} 
              enriched={enrichedData?.company_name}
              icon={Building}
            />
            <EnrichmentField 
              label="Domain" 
              current={prospect.company_domain} 
              enriched={enrichedData?.company_domain}
              icon={Globe}
            />
            <EnrichmentField 
              label="Industry" 
              current={prospect.industry} 
              enriched={enrichedData?.industry}
              icon={Briefcase}
            />
            <EnrichmentField 
              label="Company Size" 
              current={prospect.company_size} 
              enriched={enrichedData?.company_size}
              icon={Users}
            />
            <EnrichmentField 
              label="Location" 
              current={prospect.location} 
              enriched={enrichedData?.location}
              icon={MapPin}
            />
            
            {enrichedData?.technologies && enrichedData.technologies.length > 0 && (
              <div className="py-2">
                <p className="text-xs text-muted-foreground mb-2">Technologies</p>
                <div className="flex flex-wrap gap-1">
                  {enrichedData.technologies.slice(0, 8).map((tech) => (
                    <Badge key={tech} variant="secondary" className="text-xs">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {enrichedData?.description && (
              <div className="py-2">
                <p className="text-xs text-muted-foreground mb-1">Description</p>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {enrichedData.description}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={applyEnrichment}>
              <Check className="w-4 h-4 mr-2" />
              Apply Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
