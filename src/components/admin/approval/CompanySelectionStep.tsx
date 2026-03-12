import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { CompanyAssignmentData } from "@/types/approval";
import { Building2, Plus, Search, ArrowLeft, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompanySelectionStepProps {
  companyNameFromRequest: string;
  industry?: string;
  companySize?: string;
  website?: string;
  location?: string;
  onSelect: (data: CompanyAssignmentData) => void;
  onBack?: () => void;
}

interface CompanyMatch {
  id: string;
  name: string;
  industry: string | null;
  company_size: string | null;
  headquarters_location: string | null;
  is_active: boolean;
  matchType: 'exact' | 'starts_with' | 'contains';
}

const COMPANY_ROLES = [
  { value: 'owner', label: 'Owner', description: 'Full control over company settings and team' },
  { value: 'admin', label: 'Admin', description: 'Manage team members and job postings' },
  { value: 'recruiter', label: 'Recruiter', description: 'Manage candidates and pipeline' },
  { value: 'member', label: 'Member', description: 'View-only access to company resources' },
] as const;

export const CompanySelectionStep = ({
  companyNameFromRequest,
  industry,
  companySize,
  website,
  location,
  onSelect,
  onBack,
}: CompanySelectionStepProps) => {
  const [companies, setCompanies] = useState<CompanyMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'select' | 'create'>('select');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [companyRole, setCompanyRole] = useState<'owner' | 'admin' | 'recruiter' | 'member'>('owner');
  const [searchQuery, setSearchQuery] = useState('');

  // New company form state
  const [newCompanyName, setNewCompanyName] = useState(companyNameFromRequest || '');
  const [newIndustry, setNewIndustry] = useState(industry || '');
  const [newCompanySize, setNewCompanySize] = useState(companySize || '');
  const [newWebsite, setNewWebsite] = useState(website || '');
  const [newLocation, setNewLocation] = useState(location || '');

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, industry, company_size, headquarters_location, is_active')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      // Score and rank by similarity to request company name
      const needle = companyNameFromRequest.toLowerCase().trim();
      const scored: CompanyMatch[] = (data || []).map((c) => {
        const hay = c.name.toLowerCase().trim();
        let matchType: 'exact' | 'starts_with' | 'contains' = 'contains';
        if (hay === needle) matchType = 'exact';
        else if (hay.startsWith(needle) || needle.startsWith(hay)) matchType = 'starts_with';
        return { ...c, matchType };
      });

      // Sort: exact first, then starts_with, then contains
      const order = { exact: 0, starts_with: 1, contains: 2 };
      scored.sort((a, b) => order[a.matchType] - order[b.matchType]);

      setCompanies(scored);

      // Auto-select exact match
      const exact = scored.find(c => c.matchType === 'exact');
      if (exact) {
        setSelectedCompanyId(exact.id);
        setMode('select');
      } else if (scored.filter(c => c.matchType !== 'contains').length === 0) {
        // No similar matches, default to create
        setMode('create');
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCompanies = useMemo(() => {
    if (!searchQuery) return companies;
    const q = searchQuery.toLowerCase();
    return companies.filter(c => c.name.toLowerCase().includes(q));
  }, [companies, searchQuery]);

  const handleContinue = () => {
    if (mode === 'select' && selectedCompanyId) {
      const selected = companies.find(c => c.id === selectedCompanyId);
      onSelect({
        companyId: selectedCompanyId,
        companyName: selected?.name || '',
        companyRole,
        industry: selected?.industry || undefined,
        companySize: selected?.company_size || undefined,
      });
    } else if (mode === 'create') {
      onSelect({
        companyId: null,
        companyName: newCompanyName,
        companyRole,
        industry: newIndustry || undefined,
        companySize: newCompanySize || undefined,
        website: newWebsite || undefined,
        headquartersLocation: newLocation || undefined,
      });
    }
  };

  const canContinue = mode === 'create' ? newCompanyName.trim().length > 0 : !!selectedCompanyId;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Searching for matching companies…</span>
      </div>
    );
  }

  const similarCompanies = companies.filter(c => c.matchType !== 'contains');

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold">Company Assignment</h3>
        <p className="text-sm text-muted-foreground mt-1">
          The partner applied as "<span className="font-medium text-foreground">{companyNameFromRequest}</span>".
          {similarCompanies.length > 0 
            ? ` We found ${similarCompanies.length} matching ${similarCompanies.length === 1 ? 'company' : 'companies'}.`
            : ' No matching companies found — you can create a new one.'}
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2">
        <Button
          variant={mode === 'select' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setMode('select')}
        >
          <Building2 className="h-4 w-4 mr-1" />
          Existing Company
        </Button>
        <Button
          variant={mode === 'create' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setMode('create')}
        >
          <Plus className="h-4 w-4 mr-1" />
          Create New
        </Button>
      </div>

      {mode === 'select' && (
        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search companies…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Company list */}
          <div className="max-h-[240px] overflow-y-auto space-y-2 pr-1">
            {filteredCompanies.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No companies match your search.</p>
            ) : (
              filteredCompanies.map((company) => (
                <Card
                  key={company.id}
                  className={cn(
                    "cursor-pointer transition-all border-2",
                    selectedCompanyId === company.id
                      ? "border-primary bg-primary/5"
                      : "border-transparent hover:border-border/60"
                  )}
                  onClick={() => setSelectedCompanyId(company.id)}
                >
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {selectedCompanyId === company.id ? (
                        <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                      ) : (
                        <Building2 className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      )}
                      <div>
                        <p className="text-sm font-medium">{company.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {[company.industry, company.company_size, company.headquarters_location]
                            .filter(Boolean)
                            .join(' · ') || 'No details'}
                        </p>
                      </div>
                    </div>
                    {company.matchType === 'exact' && (
                      <Badge variant="default" className="text-xs">Exact Match</Badge>
                    )}
                    {company.matchType === 'starts_with' && (
                      <Badge variant="secondary" className="text-xs">Similar</Badge>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {mode === 'create' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Company Name *</Label>
              <Input value={newCompanyName} onChange={e => setNewCompanyName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Industry</Label>
              <Input value={newIndustry} onChange={e => setNewIndustry(e.target.value)} placeholder="e.g. Technology" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Company Size</Label>
              <Select value={newCompanySize} onValueChange={setNewCompanySize}>
                <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-10">1-10</SelectItem>
                  <SelectItem value="11-50">11-50</SelectItem>
                  <SelectItem value="51-200">51-200</SelectItem>
                  <SelectItem value="201-500">201-500</SelectItem>
                  <SelectItem value="501-1000">501-1000</SelectItem>
                  <SelectItem value="1001+">1001+</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Website</Label>
              <Input value={newWebsite} onChange={e => setNewWebsite(e.target.value)} placeholder="https://" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-sm font-medium">Headquarters</Label>
              <Input value={newLocation} onChange={e => setNewLocation(e.target.value)} placeholder="e.g. Amsterdam, Netherlands" />
            </div>
          </div>
        </div>
      )}

      <Separator />

      {/* Company Role */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Partner Role in Company</Label>
        <RadioGroup value={companyRole} onValueChange={(v) => setCompanyRole(v as typeof companyRole)}>
          <div className="grid grid-cols-2 gap-2">
            {COMPANY_ROLES.map((role) => (
              <label
                key={role.value}
                className={cn(
                  "flex items-start gap-3 rounded-lg border-2 p-3 cursor-pointer transition-all",
                  companyRole === role.value
                    ? "border-primary bg-primary/5"
                    : "border-border/30 hover:border-border/60"
                )}
              >
                <RadioGroupItem value={role.value} className="mt-0.5" />
                <div>
                  <p className="text-sm font-medium">{role.label}</p>
                  <p className="text-xs text-muted-foreground">{role.description}</p>
                </div>
              </label>
            ))}
          </div>
        </RadioGroup>
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-2">
        {onBack && (
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        )}
        <Button
          variant="primary"
          onClick={handleContinue}
          disabled={!canContinue}
          className="ml-auto"
        >
          Continue <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};
