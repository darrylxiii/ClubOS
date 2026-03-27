import { useTranslation } from 'react-i18next';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Image, MessageSquare, ExternalLink, Info } from "lucide-react";

interface BrandingSettings {
  custom_logo_url: string | null;
  confirmation_message: string;
  redirect_url: string;
}

interface BookingLinkBrandingSettingsProps {
  value: BrandingSettings;
  onChange: (value: BrandingSettings) => void;
}

/**
 * Branding settings for booking links.
 * Allows custom logo (alongside TQC branding), confirmation message, and redirect URL.
 * "Powered by The Quantum Club" is permanent and never removable.
 */
export function BookingLinkBrandingSettings({
  value,
  onChange,
}: BookingLinkBrandingSettingsProps) {
  const { t } = useTranslation('common');
  return (
    <div className="space-y-5 pt-4 border-t">
      <h3 className="font-semibold flex items-center gap-2">
        <Image className="h-4 w-4" />
        Branding & Customization
      </h3>

      <div className="rounded-md bg-muted/50 p-3 flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <span>
          "Powered by The Quantum Club" branding is always displayed on booking pages. Your custom logo appears alongside it.
        </span>
      </div>

      {/* Custom Logo */}
      <div className="space-y-2">
        <Label>{t("custom_logo_optional", "Custom Logo (optional)")}</Label>
        <p className="text-xs text-muted-foreground">
          Add your company logo to the booking page header
        </p>
        {value.custom_logo_url ? (
          <div className="flex items-center gap-3">
            <img
              src={value.custom_logo_url}
              alt={t("custom_logo", "Custom logo")}
              className="h-12 w-auto rounded border border-border object-contain bg-background p-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onChange({ ...value, custom_logo_url: null })}
            >
              Remove
            </Button>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground italic">
            Logo upload requires connecting storage. Use a URL for now.
          </div>
        )}
        <Input
          type="url"
          value={value.custom_logo_url || ""}
          onChange={(e) => onChange({ ...value, custom_logo_url: e.target.value || null })}
          placeholder="https://yoursite.com/logo.png"
        />
      </div>

      {/* Confirmation Message */}
      <div className="space-y-2">
        <Label htmlFor="confirmation_message" className="flex items-center gap-2">
          <MessageSquare className="h-3.5 w-3.5" />
          Confirmation Message (optional)
        </Label>
        <Textarea
          id="confirmation_message"
          value={value.confirmation_message}
          onChange={(e) => onChange({ ...value, confirmation_message: e.target.value })}
          placeholder={t("thank_you_for_booking", "Thank you for booking. We look forward to meeting you.")}
          rows={3}
          maxLength={500}
        />
        <p className="text-xs text-muted-foreground">
          Shown on the confirmation screen after booking ({value.confirmation_message.length}/500)
        </p>
      </div>

      {/* Redirect URL */}
      <div className="space-y-2">
        <Label htmlFor="redirect_url" className="flex items-center gap-2">
          <ExternalLink className="h-3.5 w-3.5" />
          Redirect URL (optional)
        </Label>
        <Input
          id="redirect_url"
          type="url"
          value={value.redirect_url}
          onChange={(e) => onChange({ ...value, redirect_url: e.target.value })}
          placeholder="https://yoursite.com/thank-you"
        />
        <p className="text-xs text-muted-foreground">
          Redirect guests to this URL after booking confirmation
        </p>
      </div>
    </div>
  );
}
