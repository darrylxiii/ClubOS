import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const billingSchema = z.object({
  legal_company_name: z.string().min(1, "Company name is required"),
  vat_number: z.string().optional(),
  billing_email: z.string().email("Valid email is required"),
  billing_address_line1: z.string().min(1, "Address is required"),
  billing_address_line2: z.string().optional(),
  billing_city: z.string().min(1, "City is required"),
  billing_state: z.string().optional(),
  billing_postal_code: z.string().min(1, "Postal code is required"),
  billing_country: z.string().default("Netherlands"),
  payment_method: z.enum(["invoice", "stripe", "bank_transfer"]),
  bank_account_iban: z.string().optional(),
  bank_account_swift: z.string().optional(),
});

type BillingFormValues = z.infer<typeof billingSchema>;

interface BillingDetailsFormProps {
  companyId: string | null;
}

export function BillingDetailsForm({ companyId }: BillingDetailsFormProps) {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const { toast } = useToast();

  const form = useForm<BillingFormValues>({
    resolver: zodResolver(billingSchema),
    defaultValues: {
      legal_company_name: "",
      vat_number: "",
      billing_email: "",
      billing_address_line1: "",
      billing_address_line2: "",
      billing_city: "",
      billing_state: "",
      billing_postal_code: "",
      billing_country: "Netherlands",
      payment_method: "invoice",
      bank_account_iban: "",
      bank_account_swift: "",
    },
  });

  useEffect(() => {
    async function fetchBillingDetails() {
      if (!companyId) {
        setFetching(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('partner_billing_details')
          .select('*')
          .eq('company_id', companyId)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          form.reset(data as any);
        }
      } catch (error) {
        console.error('Error fetching billing details:', error);
      } finally {
        setFetching(false);
      }
    }

    fetchBillingDetails();
  }, [companyId, form]);

  const onSubmit = async (values: BillingFormValues) => {
    if (!companyId) {
      toast({
        title: "Error",
        description: "Company ID not found",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('partner_billing_details')
        .upsert({
          ...values,
          company_id: companyId,
        } as any);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Billing details saved successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="legal_company_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Legal Company Name *</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="vat_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>VAT Number</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="billing_email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Billing Email *</FormLabel>
                <FormControl>
                  <Input type="email" {...field} />
                </FormControl>
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="invoice">Invoice (Bank Transfer)</SelectItem>
                    <SelectItem value="stripe">Credit Card (Stripe)</SelectItem>
                    <SelectItem value="bank_transfer">Direct Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium">Billing Address</h3>
          
          <FormField
            control={form.control}
            name="billing_address_line1"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address Line 1 *</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="billing_address_line2"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address Line 2</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="billing_city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="billing_postal_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Postal Code *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="billing_country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {form.watch('payment_method') === 'bank_transfer' && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Bank Account Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="bank_account_iban"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IBAN</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bank_account_swift"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SWIFT/BIC</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        )}

        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Billing Details
        </Button>
      </form>
    </Form>
  );
}
