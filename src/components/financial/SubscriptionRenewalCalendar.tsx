import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useVendorSubscriptions, VendorSubscription } from '@/hooks/useVendorSubscriptions';
import { ChevronLeft, ChevronRight, Calendar, AlertTriangle } from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay,
  addMonths,
  subMonths,
  getDay,
  isToday,
  parseISO
} from 'date-fns';
import { cn } from '@/lib/utils';

interface SubscriptionRenewalCalendarProps {
  onSelectSubscription?: (subscription: VendorSubscription) => void;
}

export function SubscriptionRenewalCalendar({ onSelectSubscription }: SubscriptionRenewalCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { data: subscriptions, isLoading } = useVendorSubscriptions('active');

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get starting day offset for the month
  const startDayOffset = getDay(monthStart);
  const emptyDays = Array(startDayOffset).fill(null);

  // Map renewals to days
  const renewalsByDay = useMemo(() => {
    const map = new Map<string, VendorSubscription[]>();
    
    subscriptions?.forEach(sub => {
      if (sub.next_renewal_date) {
        const dateKey = format(parseISO(sub.next_renewal_date), 'yyyy-MM-dd');
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey)!.push(sub);
      }
    });
    
    return map;
  }, [subscriptions]);

  const getCriticalityColor = (criticality: string) => {
    switch (criticality) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'high': return 'bg-warning text-warning-foreground';
      case 'medium': return 'bg-primary text-primary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getCriticalityBorder = (criticality: string) => {
    switch (criticality) {
      case 'critical': return 'border-l-destructive';
      case 'high': return 'border-l-warning';
      case 'medium': return 'border-l-primary';
      default: return 'border-l-muted-foreground';
    }
  };

  // Get renewals for current month summary
  const monthRenewals = useMemo(() => {
    return subscriptions?.filter(sub => {
      if (!sub.next_renewal_date) return false;
      const renewalDate = parseISO(sub.next_renewal_date);
      return isSameMonth(renewalDate, currentMonth);
    }) || [];
  }, [subscriptions, currentMonth]);

  const totalMonthCost = monthRenewals.reduce((sum, sub) => {
    return sum + (sub.billing_cycle === 'annual' ? sub.annual_cost : sub.monthly_cost);
  }, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Renewal Calendar
            </CardTitle>
            <CardDescription>
              {monthRenewals.length} renewals this month • {formatCurrency(totalMonthCost)} total
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[120px] text-center">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for offset */}
          {emptyDays.map((_, i) => (
            <div key={`empty-${i}`} className="h-24 bg-muted/30 rounded-md" />
          ))}
          
          {/* Day cells */}
          {days.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayRenewals = renewalsByDay.get(dateKey) || [];
            const hasRenewals = dayRenewals.length > 0;
            const hasCritical = dayRenewals.some(s => s.business_criticality === 'critical');
            
            return (
              <div
                key={dateKey}
                className={cn(
                  "h-24 p-1 rounded-md border transition-colors",
                  isToday(day) && "border-primary",
                  hasRenewals && "bg-muted/50",
                  !hasRenewals && "bg-background"
                )}
              >
                <div className={cn(
                  "text-xs font-medium mb-1 flex items-center justify-between",
                  isToday(day) && "text-primary"
                )}>
                  <span>{format(day, 'd')}</span>
                  {hasCritical && <AlertTriangle className="h-3 w-3 text-destructive" />}
                </div>
                
                <div className="space-y-0.5 overflow-hidden">
                  {dayRenewals.slice(0, 2).map(sub => (
                    <button
                      key={sub.id}
                      onClick={() => onSelectSubscription?.(sub)}
                      className={cn(
                        "w-full text-left text-[10px] px-1 py-0.5 rounded truncate border-l-2",
                        getCriticalityBorder(sub.business_criticality),
                        "bg-background hover:bg-muted transition-colors"
                      )}
                    >
                      {sub.vendor_name}
                    </button>
                  ))}
                  {dayRenewals.length > 2 && (
                    <span className="text-[10px] text-muted-foreground px-1">
                      +{dayRenewals.length - 2} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t">
          <span className="text-xs text-muted-foreground">Criticality:</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-destructive" />
              <span className="text-xs">Critical</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-warning" />
              <span className="text-xs">High</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-xs">Medium</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-muted-foreground" />
              <span className="text-xs">Low</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
