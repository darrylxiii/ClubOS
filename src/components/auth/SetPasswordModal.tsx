import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { Button } from "@/components/ui/button";
import { Mail, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const emailSchema = z.string().email();

interface SetPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SetPasswordModal({ open, onOpenChange }: SetPasswordModalProps) {
  const { t } = useTranslation('auth');
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!emailSchema.safeParse(email).success) {
      toast.error(t('errors.invalidEmail'));
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('password-reset-request', {
        body: { email },
      });

      if (error) throw error;

      if (data?.rate_limited) {
        toast.error(data.message || t('errors.tooManyAttempts'));
        setIsLoading(false);
        return;
      }

      setSent(true);
    } catch {
      toast.error(t('errors.genericError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = (value: boolean) => {
    if (!value) {
      setSent(false);
      setEmail("");
    }
    onOpenChange(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="w-12 h-12 mx-auto mb-2 bg-primary/10 rounded-xl flex items-center justify-center">
            <KeyRound className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-center">{t('setPassword.title')}</DialogTitle>
          <DialogDescription className="text-center">
            {t('setPassword.subtitle')}
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="text-center space-y-4 py-4 animate-in fade-in duration-500">
            <div className="w-14 h-14 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <Mail className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">{t('setPassword.checkEmail')}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t('setPassword.checkEmailDescription', { email })}
              </p>
            </div>
            <Button variant="outline" className="w-full" onClick={() => handleClose(false)}>
              {t('resetPassword.backToLogin')}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t('login.email')}</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                disabled={isLoading}
                autoFocus
                className="bg-background/50"
              />
            </div>
            <RainbowButton
              type="submit"
              className="w-full"
              disabled={isLoading || !email}
            >
              {isLoading ? "..." : t('setPassword.sendLink')}
            </RainbowButton>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
