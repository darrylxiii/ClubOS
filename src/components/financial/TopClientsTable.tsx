import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useTopClients } from "@/hooks/useMoneybirdFinancials";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

interface TopClientsTableProps {
  year?: number;
  limit?: number;
}

export function TopClientsTable({ year, limit = 5 }: TopClientsTableProps) {
  const topClients = useTopClients(year);
  const displayClients = topClients.slice(0, limit);

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

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
          <TableHead>Client</TableHead>
          <TableHead className="text-right">Net Revenue</TableHead>
          <TableHead className="text-right">VAT</TableHead>
          <TableHead className="text-right">Score</TableHead>
          <TableHead className="text-right">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {displayClients.map((client, index) => {
          // Calculate net revenue (excluding 21% VAT)
          const netRevenue = client.revenue / 1.21;
          const vatAmount = client.revenue - netRevenue;
          const collectionRate = client.revenue > 0 
            ? (client.paid / client.revenue) * 100 
            : 0;
          const company = getCompanyByName(client.name);
          
          return (
            <TableRow key={client.contact_id}>
              <TableCell className="font-medium text-muted-foreground">
                {index + 1}
              </TableCell>
              <TableCell className="font-medium">
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
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(netRevenue)}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {formatCurrency(vatAmount)}
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
