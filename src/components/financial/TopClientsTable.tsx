import { useTranslation } from 'react-i18next';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useTopClients } from "@/hooks/useMoneybirdFinancials";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCurrency } from "@/lib/currency";

interface TopClientsTableProps {
  year?: number;
  limit?: number;
}

export function TopClientsTable({ year, limit = 5 }: TopClientsTableProps) {
  const { t } = useTranslation('common');
  const topClients = useTopClients(year);
  const displayClients = topClients.slice(0, limit);

  // Calculate total revenue for concentration risk
  const totalRevenue = topClients.reduce((sum, c) => sum + c.revenue, 0);

  // Fetch company data to get payment scores and slugs
  const { data: companies } = useQuery({
    queryKey: ['companies-payment-scores'],
    queryFn: async () => {
      const { data } = await supabase
        .from('companies')
        .select('id, name, slug, payment_reliability_score');
      return data || [];
    },
  });

  const getCompanyByName = (name: string) => {
    if (!name) return null;
    return companies?.find(c => c.name?.toLowerCase() === name.toLowerCase());
  };

  // Import centralized formatCurrency - already imported at top

  const getPaymentScoreBadge = (score: number | null) => {
    if (score === null || score === undefined) return null;
    if (score >= 80) return <Badge variant="default" className="bg-green-500/10 text-green-700 dark:text-green-400">{score}</Badge>;
    if (score >= 50) return <Badge variant="secondary">{score}</Badge>;
    return <Badge variant="destructive">{score}</Badge>;
  };

  if (displayClients.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No client data available. Sync financial data first.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">#</TableHead>
          <TableHead>{t("client", "Client")}</TableHead>
          <TableHead className="text-right">{t("net_revenue", "Net Revenue")}</TableHead>
          <TableHead className="text-right">{t("share", "Share")}</TableHead>
          <TableHead className="text-right">{t("score", "Score")}</TableHead>
          <TableHead className="text-right">{t("status", "Status")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {displayClients.map((client, index) => {
          // client.revenue is already NET from the edge function (moneybird-fetch-financials stores net amounts)
          const netRevenue = client.revenue;
          const collectionRate = client.revenue > 0 
            ? (client.paid / client.revenue) * 100 
            : 0;
          const company = getCompanyByName(client.name);
          const revenueShare = totalRevenue > 0 ? (client.revenue / totalRevenue) * 100 : 0;
          const isConcentrationRisk = revenueShare >= 30;
          
          return (
            <TableRow key={client.contact_id}>
              <TableCell className="font-medium text-muted-foreground">
                {index + 1}
              </TableCell>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  {company?.slug ? (
                    <Link 
                      to={`/company/${company.slug}?tab=financials`}
                      className="hover:text-primary hover:underline transition-colors"
                    >
                      {client.name || 'Unknown'}
                    </Link>
                  ) : (
                    client.name || 'Unknown'
                  )}
                  {isConcentrationRisk && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <AlertTriangle className="h-4 w-4 text-warning" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Concentration risk: {revenueShare.toFixed(0)}% of total revenue</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(netRevenue)}
              </TableCell>
              <TableCell className="text-right">
                <span className={isConcentrationRisk ? 'text-warning font-medium' : 'text-muted-foreground'}>
                  {revenueShare.toFixed(0)}%
                </span>
              </TableCell>
              <TableCell className="text-right">
                {getPaymentScoreBadge(company?.payment_reliability_score ?? null)}
              </TableCell>
              <TableCell className="text-right">
                <Badge 
                  variant={collectionRate >= 100 ? 'default' : collectionRate >= 50 ? 'secondary' : 'destructive'}
                >
                  {collectionRate.toFixed(0)}% paid
                </Badge>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
