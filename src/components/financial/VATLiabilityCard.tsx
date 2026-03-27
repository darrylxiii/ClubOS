import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Receipt, TrendingUp, Clock, AlertTriangle } from "lucide-react";
import { useVATSummary } from "@/hooks/useVATData";
import { formatCurrency } from "@/lib/currency";

interface VATLiabilityCardProps {
  year?: number;
  legalEntity?: string;
}

const ENTITY_CONFIG: Record<string, { vatRate: number; vatLabel: string; authority: string; btwNumber: string | null; flag: string }> = {
  tqc_nl: { vatRate: 21, vatLabel: 'BTW', authority: 'Belastingdienst', btwNumber: 'NL004888038B44', flag: '🇳🇱' },
  tqc_dubai: { vatRate: 5, vatLabel: 'VAT', authority: 'FTA (Federal Tax Authority)', btwNumber: null, flag: '🇦🇪' },
};

export function VATLiabilityCard({ year, legalEntity }: VATLiabilityCardProps) {
  const { t } = useTranslation('common');
  const { data, isLoading } = useVATSummary(year, legalEntity);

  const config = ENTITY_CONFIG[legalEntity || 'tqc_nl'] || ENTITY_CONFIG.tqc_nl;
  const isConsolidated = !legalEntity || legalEntity === 'all';

  // Use centralized formatCurrency imported at top

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
  const nextFilingDeadline = new Date(
    new Date().getFullYear(),
    currentQuarter * 3 + 1,
    0
  );

  const vatLabel = isConsolidated ? 'VAT' : config.vatLabel;
  const items = [
    {
      label: t('financial.netRevenue'),
      value: formatCurrency(data?.netRevenue || 0),
      description: isConsolidated ? t('financial.exclMixedVAT') : t('financial.exclVATRate', { rate: config.vatRate, label: config.vatLabel }),
      icon: TrendingUp,
      color: 'text-green-500',
    },
    {
      label: t('financial.vatCollected', { label: vatLabel }),
      value: formatCurrency(data?.vatCollectedPaid || 0),
      description: t('financial.fromPaidInvoices'),
      icon: Receipt,
      color: 'text-blue-500',
    },
    {
      label: t('financial.vatOutstanding', { label: vatLabel }),
      value: formatCurrency(data?.vatCollectedOutstanding || 0),
      description: t('financial.fromUnpaidInvoices'),
      icon: Clock,
      color: 'text-amber-500',
    },
    {
      label: t('financial.totalVATLiability', { label: vatLabel }),
      value: formatCurrency(data?.vatCollected || 0),
      description: isConsolidated ? t('financial.combinedLiability') : t('financial.owedTo', { authority: config.authority }),
      icon: AlertTriangle,
      color: 'text-destructive',
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              {isConsolidated
                ? t('financial.vatPositionAll')
                : `${config.flag} ${t('financial.vatPosition', { rate: config.vatRate, label: config.vatLabel })}`}
            </CardTitle>
            <CardDescription>
              {isConsolidated
                ? t('financial.combinedVATLiabilityFrom', { count: data?.invoiceCount || 0 })
                : t('financial.vatLiabilityFrom', { label: config.vatLabel, count: data?.invoiceCount || 0 })}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {!isConsolidated && config.btwNumber && (
              <Badge variant="secondary" className="text-xs font-mono tracking-wide">
                {config.vatLabel}: {config.btwNumber}
              </Badge>
            )}
            {(!isConsolidated && legalEntity === 'tqc_nl') && (
              <Badge variant="outline" className="text-xs">
                {t('financial.nextFiling', { quarter: currentQuarter, date: nextFilingDeadline.toLocaleDateString('nl-NL', { month: 'short', day: 'numeric' }) })}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.map((item) => (
            <div key={item.label} className="space-y-1">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
                {item.label}
              </div>
              <div className="text-xl font-bold">{item.value}</div>
              <div className="text-xs text-muted-foreground">{item.description}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
