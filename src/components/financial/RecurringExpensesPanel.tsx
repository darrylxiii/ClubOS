import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, ExternalLink } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { useVendorSubscriptions } from "@/hooks/useVendorSubscriptions";

interface RecurringExpense {
  id: string;
  description: string;
  vendor: string | null;
  amount: number;
  recurring_frequency: string | null;
  category_name: string;
}

interface RecurringExpensesPanelProps {
  recurringExpenses: RecurringExpense[];
}

function normalizeToMonthly(amount: number, frequency: string | null): number {
  switch (frequency) {
    case "quarterly": return amount / 3;
    case "semi-annual": return amount / 6;
    case "annual": return amount / 12;
    default: return amount; // monthly or unset
  }
}

function frequencyLabel(f: string | null): string {
  switch (f) {
    case "monthly": return "Monthly";
    case "quarterly": return "Quarterly";
    case "semi-annual": return "Semi-Annual";
    case "annual": return "Annual";
    default: return "Monthly";
  }
}

export default function RecurringExpensesPanel({ recurringExpenses }: RecurringExpensesPanelProps) {
  const { data: subscriptions } = useVendorSubscriptions("active");

  const totalRecurringMonthly = recurringExpenses.reduce(
    (sum, e) => sum + normalizeToMonthly(e.amount, e.recurring_frequency),
    0
  );

  const totalSubsMonthly = subscriptions?.reduce((sum, s) => sum + s.monthly_cost, 0) || 0;
  const totalMonthlyBurn = totalRecurringMonthly + totalSubsMonthly;

  const grouped = recurringExpenses.reduce((acc, e) => {
    const key = e.recurring_frequency || "monthly";
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {} as Record<string, RecurringExpense[]>);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Recurring Costs
          </CardTitle>
          <span className="text-lg font-bold text-destructive">
            {formatCurrency(totalMonthlyBurn)} /mo
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recurring Expenses by Frequency */}
        {Object.entries(grouped).map(([freq, items]) => (
          <div key={freq}>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              {frequencyLabel(freq)}
            </p>
            <div className="space-y-2">
              {items.map((e) => (
                <div key={e.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="truncate">{e.vendor || e.description}</span>
                    <Badge variant="outline" className="text-[10px] shrink-0">{e.category_name}</Badge>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <span className="font-medium">{formatCurrency(e.amount)}</span>
                    {e.recurring_frequency !== "monthly" && (
                      <span className="text-xs text-muted-foreground ml-1">
                        ({formatCurrency(normalizeToMonthly(e.amount, e.recurring_frequency))}/mo)
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Vendor Subscriptions */}
        {subscriptions && subscriptions.length > 0 && (
          <>
            <Separator />
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                SaaS Subscriptions
                <ExternalLink className="h-3 w-3" />
              </p>
              <div className="space-y-2">
                {subscriptions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="truncate">{s.vendor_name}</span>
                      <Badge variant="secondary" className="text-[10px] shrink-0">{s.billing_cycle}</Badge>
                    </div>
                    <span className="font-medium shrink-0 ml-2">{formatCurrency(s.monthly_cost)}/mo</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {recurringExpenses.length === 0 && (!subscriptions || subscriptions.length === 0) && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No recurring expenses yet. Mark an expense as recurring when adding it.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
