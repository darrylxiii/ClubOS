import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Mail, Link2, Unlink, Loader2 } from "lucide-react";
import { FaGoogle, FaLinkedin } from "react-icons/fa";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const AccountLinking = () => {
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
      toast.error("Failed to load connected accounts");
    } finally {
      setLoading(false);
    }
  };

  const hasEmailPassword = identities.some(i => i.provider === "email");
  const hasGoogle = identities.some(i => i.provider === "google");
  const hasLinkedIn = identities.some(i => i.provider === "linkedin_oidc");

  const handleLinkGoogle = async () => {
    try {
      const { error } = await supabase.auth.linkIdentity({
        provider: 'google',
      });
      if (error) throw error;
      toast.success("Redirecting to Google...");
    } catch (error: any) {
      console.error("Error linking Google:", error);
      toast.error(error.message || "Failed to link Google account");
    }
  };

  const handleLinkLinkedIn = async () => {
    try {
      const { error } = await supabase.auth.linkIdentity({
        provider: 'linkedin_oidc',
      });
      if (error) throw error;
      toast.success("Redirecting to LinkedIn...");
    } catch (error: any) {
      console.error("Error linking LinkedIn:", error);
      toast.error(error.message || "Failed to link LinkedIn account");
    }
  };

  const handleUnlinkIdentity = async (identity: any, provider: string) => {
    if (identities.length === 1) {
      toast.error("Cannot remove your only login method");
      return;
    }

    try {
      const { error } = await supabase.auth.unlinkIdentity(identity);
      if (error) throw error;
      
      toast.success(`${provider} account disconnected`);
      await loadIdentities();
    } catch (error: any) {
      console.error("Error unlinking identity:", error);
      toast.error(error.message || "Failed to disconnect account");
    }
  };

  const handleSetPassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword.length < 12) {
      toast.error("Password must be at least 12 characters");
      return;
    }

    setIsSettingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      
      if (error) throw error;
      
      toast.success("Password set successfully! You can now login with email and password.");
      setShowPasswordDialog(false);
      setNewPassword("");
      setConfirmPassword("");
      await loadIdentities();
    } catch (error: any) {
      console.error("Error setting password:", error);
      toast.error(error.message || "Failed to set password");
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
        <CardDescription>
          Link multiple login methods to your account for easy access
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Email/Password */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold">Email & Password</p>
              <p className="text-sm text-muted-foreground">
                {hasEmailPassword ? "Connected" : "Not connected"}
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
                  <DialogTitle>Set Password</DialogTitle>
                  <DialogDescription>
                    Add a password to enable email/password login
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
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
              <FaGoogle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="font-semibold">Google</p>
              <p className="text-sm text-muted-foreground">
                {hasGoogle ? "Connected" : "Not connected"}
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

        {/* LinkedIn */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <FaLinkedin className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="font-semibold">LinkedIn</p>
              <p className="text-sm text-muted-foreground">
                {hasLinkedIn ? "Connected" : "Not connected"}
              </p>
            </div>
          </div>
          {hasLinkedIn ? (
            identities.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const linkedInIdentity = identities.find(i => i.provider === "linkedin_oidc");
                  if (linkedInIdentity) {
                    handleUnlinkIdentity(linkedInIdentity, "LinkedIn");
                  }
                }}
              >
                <Unlink className="w-4 h-4 mr-2" />
                Disconnect
              </Button>
            )
          ) : (
            <Button variant="outline" size="sm" onClick={handleLinkLinkedIn}>
              <Link2 className="w-4 h-4 mr-2" />
              Connect
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
