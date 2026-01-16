import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { useCreateVendorSubscription, useUpdateVendorSubscription, VendorSubscription } from '@/hooks/useVendorSubscriptions';
import { format } from 'date-fns';

const formSchema = z.object({
  vendor_name: z.string().min(1, 'Vendor name is required'),
  vendor_website: z.string().url().optional().or(z.literal('')),
  category: z.string().min(1, 'Category is required'),
  contract_start_date: z.string().min(1, 'Start date is required'),
  contract_end_date: z.string().optional(),
  billing_cycle: z.string().min(1, 'Billing cycle is required'),
  next_renewal_date: z.string().optional(),
  auto_renewal: z.boolean(),
  cancellation_notice_days: z.coerce.number().min(0),
  monthly_cost: z.coerce.number().min(0, 'Cost must be positive'),
  currency: z.string().min(1),
  payment_method: z.string().optional(),
  seats_licensed: z.coerce.number().optional(),
  seats_used: z.coerce.number().optional(),
  department: z.string().optional(),
  business_criticality: z.string().min(1),
  expected_bank_reference: z.string().optional(),
  linked_bank_account: z.string().optional(),
  status: z.string().min(1),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface AddVendorSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingSubscription?: VendorSubscription | null;
}

export function AddVendorSubscriptionDialog({ 
  open, 
  onOpenChange,
  editingSubscription 
}: AddVendorSubscriptionDialogProps) {
  const createMutation = useCreateVendorSubscription();
  const updateMutation = useUpdateVendorSubscription();
  const isEditing = !!editingSubscription;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vendor_name: '',
      vendor_website: '',
      category: 'Software & SaaS',
      contract_start_date: format(new Date(), 'yyyy-MM-dd'),
      contract_end_date: '',
      billing_cycle: 'monthly',
      next_renewal_date: '',
      auto_renewal: true,
      cancellation_notice_days: 30,
      monthly_cost: 0,
      currency: 'EUR',
      payment_method: '',
      seats_licensed: undefined,
      seats_used: undefined,
      department: '',
      business_criticality: 'medium',
      expected_bank_reference: '',
      linked_bank_account: '',
      status: 'active',
      notes: '',
    },
  });

  useEffect(() => {
    if (editingSubscription) {
      form.reset({
        vendor_name: editingSubscription.vendor_name,
        vendor_website: editingSubscription.vendor_website || '',
        category: editingSubscription.category,
        contract_start_date: editingSubscription.contract_start_date,
        contract_end_date: editingSubscription.contract_end_date || '',
        billing_cycle: editingSubscription.billing_cycle,
        next_renewal_date: editingSubscription.next_renewal_date || '',
        auto_renewal: editingSubscription.auto_renewal,
        cancellation_notice_days: editingSubscription.cancellation_notice_days,
        monthly_cost: editingSubscription.monthly_cost,
        currency: editingSubscription.currency,
        payment_method: editingSubscription.payment_method || '',
        seats_licensed: editingSubscription.seats_licensed || undefined,
        seats_used: editingSubscription.seats_used || undefined,
        department: editingSubscription.department || '',
        business_criticality: editingSubscription.business_criticality,
        expected_bank_reference: editingSubscription.expected_bank_reference || '',
        linked_bank_account: editingSubscription.linked_bank_account || '',
        status: editingSubscription.status,
        notes: editingSubscription.notes || '',
      });
    } else {
      form.reset();
    }
  }, [editingSubscription, form]);

  const onSubmit = async (data: FormData) => {
    const cleanedData = {
      ...data,
      vendor_website: data.vendor_website || null,
      contract_end_date: data.contract_end_date || null,
      next_renewal_date: data.next_renewal_date || null,
      payment_method: data.payment_method || null,
      seats_licensed: data.seats_licensed || null,
      seats_used: data.seats_used || null,
      department: data.department || null,
      expected_bank_reference: data.expected_bank_reference || null,
      linked_bank_account: data.linked_bank_account || null,
      notes: data.notes || null,
    };

    if (isEditing && editingSubscription) {
      await updateMutation.mutateAsync({ id: editingSubscription.id, data: cleanedData as any });
    } else {
      await createMutation.mutateAsync(cleanedData as any);
    }
    onOpenChange(false);
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Subscription' : 'Add Vendor Subscription'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="vendor_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Slack" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="vendor_website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Software & SaaS">Software & SaaS</SelectItem>
                        <SelectItem value="Infrastructure">Infrastructure</SelectItem>
                        <SelectItem value="Professional Services">Professional Services</SelectItem>
                        <SelectItem value="Office & Facilities">Office & Facilities</SelectItem>
                        <SelectItem value="Marketing & Sales">Marketing & Sales</SelectItem>
                        <SelectItem value="HR & Benefits">HR & Benefits</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Engineering">Engineering</SelectItem>
                        <SelectItem value="Operations">Operations</SelectItem>
                        <SelectItem value="Sales">Sales</SelectItem>
                        <SelectItem value="Finance">Finance</SelectItem>
                        <SelectItem value="HR">HR</SelectItem>
                        <SelectItem value="Marketing">Marketing</SelectItem>
                        <SelectItem value="Executive">Executive</SelectItem>
                        <SelectItem value="All">All</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Financials */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="monthly_cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly Cost *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="billing_cycle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Billing Cycle</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="annually">Annually</SelectItem>
                        <SelectItem value="one-time">One-time</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Contract Dates */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="contract_start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contract Start *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contract_end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contract End</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="next_renewal_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Next Renewal</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Status & Criticality */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="trial">Trial</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="business_criticality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Criticality</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="payment_method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="credit_card">Credit Card</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="revolut">Revolut</SelectItem>
                        <SelectItem value="ing">ING</SelectItem>
                        <SelectItem value="paypal">PayPal</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Seats */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="seats_licensed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seats Licensed</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g. 10" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="seats_used"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seats Used</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g. 7" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cancellation_notice_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cancellation Notice (days)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Auto Renewal */}
            <FormField
              control={form.control}
              name="auto_renewal"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="!mt-0">Auto-renewal enabled</FormLabel>
                </FormItem>
              )}
            />

            {/* Banking Integration */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="expected_bank_reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank Reference Pattern</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. REVOLUT*SLACK" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="linked_bank_account"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Linked Bank Account</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="revolut">Revolut</SelectItem>
                        <SelectItem value="ing">ING</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Additional notes..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditing ? 'Update' : 'Add Subscription'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
