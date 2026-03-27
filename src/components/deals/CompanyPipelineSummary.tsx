import { useTranslation } from 'react-i18next';
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, ArrowUpDown, TrendingUp } from "lucide-react";
import { useDealPipeline, Deal } from "@/hooks/useDealPipeline";
import { formatCurrency } from "@/lib/format";

type SortKey = "company" | "deals" | "gross" | "weighted" | "stage";
type SortDir = "asc" | "desc";

interface CompanySummary {
  companyId: string;
  companyName: string;
  dealCount: number;
  grossPipeline: number;
  weightedPipeline: number;
  furthestStage: string;
  deals: Deal[];
}

export function CompanyPipelineSummary({ onCompanyFilter }: { onCompanyFilter?: (companyId: string | null) => void }) {
  const { t } = useTranslation('common');
  const { data: deals } = useDealPipeline();
  const [sortKey, setSortKey] = useState<SortKey>("weighted");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);

  const companies = useMemo(() => {
    if (!deals || deals.length === 0) return [];

    const map = new Map<string, CompanySummary>();

    deals.forEach((deal) => {
      const cId = deal.company_id || "unknown";
      const cName = deal.company_name || "Unknown";
      if (!map.has(cId)) {
        map.set(cId, {
          companyId: cId,
          companyName: cName,
          dealCount: 0,
          grossPipeline: 0,
          weightedPipeline: 0,
          furthestStage: deal.deal_stage || "New",
          deals: [],
        });
      }
      const entry = map.get(cId)!;
      entry.dealCount += 1;
      const dealValue = deal.total_deal_value || deal.estimated_value || 0;
      entry.grossPipeline += dealValue;
      entry.weightedPipeline += dealValue * ((deal.deal_probability || 0) / 100);
      entry.deals.push(deal);
    });

    return Array.from(map.values());
  }, [deals]);

  const sorted = useMemo(() => {
    const arr = [...companies];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "company": cmp = a.companyName.localeCompare(b.companyName); break;
        case "deals": cmp = a.dealCount - b.dealCount; break;
        case "gross": cmp = a.grossPipeline - b.grossPipeline; break;
        case "weighted": cmp = a.weightedPipeline - b.weightedPipeline; break;
        case "stage": cmp = a.furthestStage.localeCompare(b.furthestStage); break;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });
    return arr;
  }, [companies, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const handleSelect = (companyId: string) => {
    const next = selectedCompany === companyId ? null : companyId;
    setSelectedCompany(next);
    onCompanyFilter?.(next);
  };

  if (companies.length === 0) return null;

  const totalGross = companies.reduce((s, c) => s + c.grossPipeline, 0);
  const totalWeighted = companies.reduce((s, c) => s + c.weightedPipeline, 0);

  const SortButton = ({ field, children }: { field: SortKey; children: React.ReactNode }) => (
    <Button variant="ghost" size="sm" className="h-auto p-0 text-xs font-medium hover:bg-transparent" onClick={() => toggleSort(field)}>
      {children}
      <ArrowUpDown className="ml-1 h-3 w-3" />
    </Button>
  );

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" />
            Company Pipeline Summary
          </CardTitle>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{companies.length} companies</span>
            <span className="font-semibold text-foreground">{formatCurrency(totalWeighted)} weighted</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><SortButton field="company">{t("company", "Company")}</SortButton></TableHead>
              <TableHead className="text-center"><SortButton field="deals">{t("deals", "Deals")}</SortButton></TableHead>
              <TableHead className="text-right"><SortButton field="gross">{t("gross_pipeline", "Gross Pipeline")}</SortButton></TableHead>
              <TableHead className="text-right"><SortButton field="weighted">{t("weighted", "Weighted")}</SortButton></TableHead>
              <TableHead><SortButton field="stage">{t("top_stage", "Top Stage")}</SortButton></TableHead>
              <TableHead className="text-right">{t("share", "Share")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.slice(0, 10).map((c) => {
              const share = totalGross > 0 ? ((c.grossPipeline / totalGross) * 100).toFixed(1) : "0";
              const isSelected = selectedCompany === c.companyId;
              return (
                <TableRow
                  key={c.companyId}
                  className={`cursor-pointer transition-colors ${isSelected ? "bg-primary/10" : "hover:bg-muted/50"}`}
                  onClick={() => handleSelect(c.companyId)}
                >
                  <TableCell className="font-medium">{c.companyName}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="text-xs">{c.dealCount}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatCurrency(c.grossPipeline)}</TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold">{formatCurrency(c.weightedPipeline)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{c.furthestStage}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${share}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground w-10 text-right">{share}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {selectedCompany && (
          <div className="mt-3 flex items-center gap-2">
            <Badge variant="default" className="text-xs">
              Filtering: {companies.find(c => c.companyId === selectedCompany)?.companyName}
            </Badge>
            <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => handleSelect(selectedCompany)}>
              Clear
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
