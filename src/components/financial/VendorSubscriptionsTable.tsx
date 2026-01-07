import { useState } from 'react';
import { useVendorSubscriptions, useUpdateVendorSubscription, useDeleteVendorSubscription, VendorSubscription } from '@/hooks/useVendorSubscriptions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, MoreHorizontal, Pencil, Trash2, ExternalLink, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { AddVendorSubscriptionDialog } from './AddVendorSubscriptionDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const categoryColors: Record<string, string> = {
  'Software & SaaS': 'bg-blue-500/10 text-blue-500',
  'Infrastructure': 'bg-purple-500/10 text-purple-500',
  'Professional Services': 'bg-green-500/10 text-green-500',
  'Office & Facilities': 'bg-orange-500/10 text-orange-500',
  'Marketing & Sales': 'bg-pink-500/10 text-pink-500',
  'HR & Benefits': 'bg-teal-500/10 text-teal-500',
  'Other': 'bg-gray-500/10 text-gray-500',
};

const criticalityColors: Record<string, string> = {
  low: 'bg-gray-500/10 text-gray-500',
  medium: 'bg-yellow-500/10 text-yellow-500',
  high: 'bg-orange-500/10 text-orange-500',
  critical: 'bg-red-500/10 text-red-500',
};

const statusColors: Record<string, string> = {
  active: 'bg-green-500/10 text-green-500',
  paused: 'bg-yellow-500/10 text-yellow-500',
  cancelled: 'bg-red-500/10 text-red-500',
  trial: 'bg-blue-500/10 text-blue-500',
  pending: 'bg-gray-500/10 text-gray-500',
};

export function VendorSubscriptionsTable() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingSubscription, setEditingSubscription] = useState<VendorSubscription | null>(null);
  const [deleteSubscription, setDeleteSubscription] = useState<VendorSubscription | null>(null);

  const { data: subscriptions, isLoading } = useVendorSubscriptions();
  const updateMutation = useUpdateVendorSubscription();
  const deleteMutation = useDeleteVendorSubscription();

  const filteredSubscriptions = subscriptions?.filter((sub) => {
    const matchesSearch = sub.vendor_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || sub.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const isRenewalSoon = (renewalDate: string | null) => {
    if (!renewalDate) return false;
    const renewal = new Date(renewalDate);
    const now = new Date();
    const daysUntilRenewal = Math.ceil((renewal.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilRenewal <= 30 && daysUntilRenewal >= 0;
  };

  const handleDelete = async () => {
    if (deleteSubscription) {
      await deleteMutation.mutateAsync(deleteSubscription.id);
      setDeleteSubscription(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Search vendors..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
        />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="Software & SaaS">Software & SaaS</SelectItem>
            <SelectItem value="Infrastructure">Infrastructure</SelectItem>
            <SelectItem value="Professional Services">Professional Services</SelectItem>
            <SelectItem value="Office & Facilities">Office & Facilities</SelectItem>
            <SelectItem value="Marketing & Sales">Marketing & Sales</SelectItem>
            <SelectItem value="HR & Benefits">HR & Benefits</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Monthly Cost</TableHead>
              <TableHead>Billing</TableHead>
              <TableHead>Next Renewal</TableHead>
              <TableHead>Criticality</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSubscriptions?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No subscriptions found
                </TableCell>
              </TableRow>
            ) : (
              filteredSubscriptions?.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{sub.vendor_name}</span>
                      {sub.vendor_website && (
                        <a
                          href={sub.vendor_website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    {sub.seats_licensed && (
                      <div className="text-xs text-muted-foreground">
                        {sub.seats_used || 0}/{sub.seats_licensed} seats
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={categoryColors[sub.category]}>
                      {sub.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(sub.monthly_cost, sub.currency)}
                  </TableCell>
                  <TableCell className="capitalize">{sub.billing_cycle}</TableCell>
                  <TableCell>
                    {sub.next_renewal_date ? (
                      <div className="flex items-center gap-1">
                        {isRenewalSoon(sub.next_renewal_date) && (
                          <AlertTriangle className="h-3 w-3 text-warning" />
                        )}
                        <span className={isRenewalSoon(sub.next_renewal_date) ? 'text-warning font-medium' : ''}>
                          {format(new Date(sub.next_renewal_date), 'MMM d, yyyy')}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={criticalityColors[sub.business_criticality]}>
                      {sub.business_criticality}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={statusColors[sub.status]}>
                      {sub.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingSubscription(sub)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteSubscription(sub)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      {editingSubscription && (
        <AddVendorSubscriptionDialog
          open={!!editingSubscription}
          onOpenChange={(open) => !open && setEditingSubscription(null)}
          editingSubscription={editingSubscription}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteSubscription} onOpenChange={(open) => !open && setDeleteSubscription(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the subscription for "{deleteSubscription?.vendor_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
