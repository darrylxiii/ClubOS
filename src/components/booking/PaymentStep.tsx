import { useTranslation } from 'react-i18next';
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CreditCard, Lock, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { getBackendConfig, nativeFetch } from "@/config/backend";

interface PaymentStepProps {
  bookingLinkSlug: string;
  paymentAmount: number;
  paymentCurrency: string;
  guestEmail: string;
  guestName: string;
  scheduledStart: string;
  scheduledEnd: string;
  timezone: string;
  notes?: string;
}

export function PaymentStep({
  bookingLinkSlug,
  paymentAmount,
  paymentCurrency,
  guestEmail,
  guestName,
  scheduledStart,
  scheduledEnd,
  timezone,
  notes,
}: PaymentStepProps) {
  const { t } = useTranslation('common');
  const [loading, setLoading] = useState(false);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const handlePayment = async () => {
    setLoading(true);
    try {
      const config = getBackendConfig();
      const response = await nativeFetch(
        `${config.baseUrl}/functions/v1/process-booking-payment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: config.publishableKey,
          },
          body: JSON.stringify({
            bookingLinkSlug,
            guestEmail,
            guestName,
            scheduledStart,
            scheduledEnd,
            timezone,
            notes,
          }),
        }
      );

      const data = JSON.parse(await response.text());

      if (!response.ok || !data.url) {
        throw new Error(data.error || "Failed to create payment session");
      }

      // Open Stripe Checkout in new tab
      window.open(data.url, "_blank");
    } catch (error: unknown) {
      console.error("Payment error:", error);
      toast.error(error instanceof Error ? error.message : "Payment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-primary/20 bg-card/50">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">{t("payment_required", "Payment required")}</h3>
            <p className="text-sm text-muted-foreground">
              Complete payment to confirm your booking
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-muted/50 border border-border/30">
          <span className="text-sm text-muted-foreground">{t("booking_fee", "Booking fee")}</span>
          <span className="text-lg font-bold">
            {formatCurrency(paymentAmount, paymentCurrency)}
          </span>
        </div>

        <Button
          onClick={handlePayment}
          disabled={loading}
          className="w-full min-h-[48px]"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Redirecting to payment...
            </>
          ) : (
            <>
              <ExternalLink className="h-4 w-4 mr-2" />
              Pay {formatCurrency(paymentAmount, paymentCurrency)}
            </>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
          <Lock className="h-3 w-3" />
          Secure payment powered by Stripe
        </p>
      </CardContent>
    </Card>
  );
}
