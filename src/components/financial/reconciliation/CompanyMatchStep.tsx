import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Building2, TrendingUp, CheckCircle2, Star } from "lucide-react";
import { InvoiceForReconciliation, CompanyForReconciliation } from "./types";
import { cn } from "@/lib/utils";

interface CompanyMatchStepProps {
  invoice: InvoiceForReconciliation;
  companies: CompanyForReconciliation[];
  selectedCompany: CompanyForReconciliation | null;
  onSelect: (company: CompanyForReconciliation) => void;
}

// Simple fuzzy match score
function calculateMatchScore(contactName: string, companyName: string): number {
  if (!contactName || !companyName) return 0;
  
  const normalize = (s: string) => s.toLowerCase()
    .replace(/\s*(b\.?v\.?|n\.?v\.?|ltd\.?|inc\.?|gmbh|llc|limited|holding|group)\.?\s*$/gi, '')
    .replace(/[^\w\s]/g, '')
    .trim();
  
  const a = normalize(contactName);
  const b = normalize(companyName);
  
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.9;
  
  // Simple word overlap
  const wordsA = new Set(a.split(/\s+/));
  const wordsB = new Set(b.split(/\s+/));
  const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;
  
  return union > 0 ? intersection / union : 0;
}

export function CompanyMatchStep({ invoice, companies, selectedCompany, onSelect }: CompanyMatchStepProps) {
  const [search, setSearch] = useState("");

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  // Calculate match scores and sort
  const companiesWithScores = useMemo(() => {
    return companies.map(company => ({
      ...company,
      matchScore: calculateMatchScore(invoice.contact_name || '', company.name),
    })).sort((a, b) => b.matchScore - a.matchScore);
  }, [companies, invoice.contact_name]);

  // Filter by search
  const filteredCompanies = useMemo(() => {
    if (!search) return companiesWithScores;
    const searchLower = search.toLowerCase();
    return companiesWithScores.filter(c => 
      c.name.toLowerCase().includes(searchLower) ||
      c.industry?.toLowerCase().includes(searchLower)
    );
  }, [companiesWithScores, search]);

  const getTierColor = (tier: string | null) => {
    switch (tier) {
      case 'platinum': return 'bg-violet-100 text-violet-800';
      case 'gold': return 'bg-yellow-100 text-yellow-800';
      case 'silver': return 'bg-gray-200 text-gray-800';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getReliabilityColor = (score: number | null) => {
    if (score === null) return 'text-muted-foreground';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search companies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Contact name hint */}
      <Card className="bg-muted/50">
        <CardContent className="py-3">
          <p className="text-sm">
            <span className="text-muted-foreground">Moneybird contact: </span>
            <span className="font-medium">{invoice.contact_name || 'Unknown'}</span>
          </p>
        </CardContent>
      </Card>

      {/* Company List */}
      <ScrollArea className="h-[350px] border rounded-lg">
        <div className="p-2 space-y-2">
          {filteredCompanies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No companies found
            </div>
          ) : (
            filteredCompanies.map((company) => (
              <Card
                key={company.id}
                className={cn(
                  "cursor-pointer transition-all hover:bg-accent/50",
                  selectedCompany?.id === company.id && "ring-2 ring-primary bg-primary/5"
                )}
                onClick={() => onSelect(company)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium truncate">{company.name}</span>
                        {selectedCompany?.id === company.id && (
                          <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 flex-wrap mt-2">
                        {company.industry && (
                          <Badge variant="outline" className="text-xs">
                            {company.industry}
                          </Badge>
                        )}
                        {company.revenue_tier && (
                          <Badge className={cn("text-xs capitalize", getTierColor(company.revenue_tier))}>
                            {company.revenue_tier}
                          </Badge>
                        )}
                        {company.matchScore > 0.5 && (
                          <Badge variant="secondary" className="text-xs">
                            {Math.round(company.matchScore * 100)}% match
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1 justify-end">
                        <TrendingUp className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {formatCurrency(company.total_revenue)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 justify-end mt-1">
                        <Star className="h-3 w-3 text-muted-foreground" />
                        <span className={cn("text-xs", getReliabilityColor(company.payment_reliability_score))}>
                          {company.payment_reliability_score !== null 
                            ? `${company.payment_reliability_score}% reliable`
                            : 'No data'}
                        </span>
                      </div>
                      {company.total_outstanding && company.total_outstanding > 0 && (
                        <p className="text-xs text-amber-600 mt-1">
                          {formatCurrency(company.total_outstanding)} outstanding
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Selected Company Preview */}
      {selectedCompany && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Selected Company</CardTitle>
            <CardDescription>This invoice will be attributed to:</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{selectedCompany.name}</p>
                <p className="text-sm text-muted-foreground">{selectedCompany.industry || 'No industry'}</p>
              </div>
              <div className="text-right">
                <p className="text-sm">
                  Lifetime revenue: <span className="font-medium">{formatCurrency(selectedCompany.total_revenue)}</span>
                </p>
                {selectedCompany.default_fee_percentage && (
                  <p className="text-xs text-muted-foreground">
                    Default fee: {selectedCompany.default_fee_percentage}%
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
