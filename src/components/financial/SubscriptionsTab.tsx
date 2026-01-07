import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { VendorSubscriptionsTable } from './VendorSubscriptionsTable';
import { SaaSStackOverviewCard } from './SaaSStackOverviewCard';
import { AddVendorSubscriptionDialog } from './AddVendorSubscriptionDialog';
import { SubscriptionRenewalCalendar } from './SubscriptionRenewalCalendar';
import { VendorSubscription } from '@/hooks/useVendorSubscriptions';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

export function SubscriptionsTab() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editSubscription, setEditSubscription] = useState<VendorSubscription | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(true);

  const handleSelectSubscription = (subscription: VendorSubscription) => {
    setEditSubscription(subscription);
    setShowAddDialog(true);
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <SaaSStackOverviewCard />

      {/* Renewal Calendar */}
      <Collapsible open={calendarOpen} onOpenChange={setCalendarOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 w-full justify-between p-0 h-auto mb-2">
            <span className="text-lg font-semibold">Renewal Calendar</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${calendarOpen ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SubscriptionRenewalCalendar onSelectSubscription={handleSelectSubscription} />
        </CollapsibleContent>
      </Collapsible>

      {/* Subscriptions Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Vendor Subscriptions</CardTitle>
            <CardDescription>
              Manage all SaaS and recurring operational costs
            </CardDescription>
          </div>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Subscription
          </Button>
        </CardHeader>
        <CardContent>
          <VendorSubscriptionsTable />
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <AddVendorSubscriptionDialog
        open={showAddDialog}
        onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) setEditSubscription(null);
        }}
        editingSubscription={editSubscription}
      />
    </div>
  );
}
