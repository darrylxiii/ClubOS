import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { VendorSubscriptionsTable } from './VendorSubscriptionsTable';
import { SaaSStackOverviewCard } from './SaaSStackOverviewCard';
import { AddVendorSubscriptionDialog } from './AddVendorSubscriptionDialog';

export function SubscriptionsTab() {
  const [showAddDialog, setShowAddDialog] = useState(false);

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <SaaSStackOverviewCard />

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

      {/* Add Dialog */}
      <AddVendorSubscriptionDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
      />
    </div>
  );
}
