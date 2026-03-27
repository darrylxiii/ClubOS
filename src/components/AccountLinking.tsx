import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Mail, Link2, Unlink, Loader2, Chrome } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useTranslation } from 'react-i18next';

export const AccountLinking = () => {
  const { t } = useTranslation('common');
  const [identities, setIdentities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  useEffect(() => {
    loadIdentities();
  }, []);

  const loadIdentities = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      
      if (user?.identities) {
        setIdentities(user.identities);
      }
    } catch (error) {
      console.error("Error loading identities:", error);
      toast.error(t('accountlinking.failedToLoadConnectedAccounts', 'Failed to load connected accounts'));
    } finally {
      setLoading(false);
    }
  };

  const hasEmailPassword = identities.some(i => i.provider === "email");
  const hasGoogle = identities.some(i => i.provider === "google");

  const handleLinkGoogle = async () => {
    try {
      const { error } = await supabase.auth.linkIdentity({
        provider: 'google',
      });
      if (error) throw error;
      toast.success(t('accountlinking.redirectingToGoogle', 'Redirecting to Google...'));
    } catch (error: unknown) {
      console.error("Error linking Google:", error);
      toast.error(error instanceof Error ? error.message : t('accountlinking.failedToLinkGoogleAccount', 'Failed to link Google account'));
    }
  };

  const handleUnlinkIdentity = async (identity: any, provider: string) => {
    if (identities.length === 1) {
      toast.error(t('accountlinking.cannotRemoveYourOnlyLoginMethod', 'Cannot remove your only login method'));
      return;
    }

    try {
      const { error } = await supabase.auth.unlinkIdentity(identity);
      if (error) throw error;
      
      toast.success(`${provider} account disconnected`);
      await loadIdentities();
    } catch (error: unknown) {
      console.error("Error unlinking identity:", error);
      toast.error(error instanceof Error ? error.message : t('accountlinking.failedToDisconnectAccount', 'Failed to disconnect account'));
    }
  };

  const handleSetPassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error(t('accountlinking.passwordsDoNotMatch', 'Passwords do not match'));
      return;
    }

    if (newPassword.length < 12) {
      toast.error(t('accountlinking.passwordMustBeAtLeast12', 'Password must be at least 12 characters'));
      return;
    }

    setIsSettingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      
      if (error) throw error;
      
      toast.success(t('accountlinking.passwordSetSuccessfullyYouCanNow', 'Password set successfully! You can now login with email and password.'));
      setShowPasswordDialog(false);
      setNewPassword("");
      setConfirmPassword("");
      await loadIdentities();
    } catch (error: unknown) {
      console.error("Error setting password:", error);
      toast.error(error instanceof Error ? error.message : t('accountlinking.failedToSetPassword', 'Failed to set password'));
    } finally {
      setIsSettingPassword(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Connected Accounts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Connected Accounts
        </CardTitle>
        <CardDescription>{t('accountlinking.linkMultipleLoginMethodsToYour', 'Link multiple login methods to your account for easy access')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Email/Password */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold">{t('accountlinking.emailPassword', 'Email & Password')}</p>
              <p className="text-sm text-muted-foreground">
                {hasEmailPassword ? t('accountlinking.connected', 'Connected') : t('accountlinking.notConnected', 'Not connected')}
              </p>
            </div>
          </div>
          {hasEmailPassword ? (
            identities.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const emailIdentity = identities.find(i => i.provider === "email");
                  if (emailIdentity) {
                    handleUnlinkIdentity(emailIdentity, "Email");
                  }
                }}
              >
                <Unlink className="w-4 h-4 mr-2" />
                Disconnect
              </Button>
            )
          ) : (
            <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Link2 className="w-4 h-4 mr-2" />
                  Set Password
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('accountlinking.setPassword', 'Set Password')}</DialogTitle>
                  <DialogDescription>{t('accountlinking.addAPasswordToEnableEmailpassword', 'Add a password to enable email/password login')}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="new-password">{t('accountlinking.newPassword', 'New Password')}</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={t('accountlinking.enterNewPassword', 'Enter new password')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirm-password">{t('accountlinking.confirmPassword', 'Confirm Password')}</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t('accountlinking.confirmPassword1', 'Confirm password')}
                    />
                  </div>
                  <Button
                    onClick={handleSetPassword}
                    disabled={isSettingPassword || !newPassword || !confirmPassword}
                    className="w-full"
                  >
                    {isSettingPassword ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Setting Password...
                      </>
                    ) : (
                      "Set Password"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Google */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
              <Chrome className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="font-semibold">Google</p>
              <p className="text-sm text-muted-foreground">
                {hasGoogle ? t('accountlinking.connected', 'Connected') : t('accountlinking.notConnected', 'Not connected')}
              </p>
            </div>
          </div>
          {hasGoogle ? (
            identities.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const googleIdentity = identities.find(i => i.provider === "google");
                  if (googleIdentity) {
                    handleUnlinkIdentity(googleIdentity, "Google");
                  }
                }}
              >
                <Unlink className="w-4 h-4 mr-2" />
                Disconnect
              </Button>
            )
          ) : (
            <Button variant="outline" size="sm" onClick={handleLinkGoogle}>
              <Link2 className="w-4 h-4 mr-2" />
              Connect
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
