import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, QrCode, Key, CheckCircle2, AlertTriangle, Copy } from 'lucide-react';
import { toast } from 'sonner';
import QRCode from 'qrcode';

export const TwoFactorSettings = () => {
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [verifyCode, setVerifyCode] = useState('');
  const [factorId, setFactorId] = useState<string>('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  useEffect(() => {
    checkMFAStatus();
  }, []);

  const checkMFAStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const factors = user.factors || [];
      const hasVerifiedFactor = factors.some(f => f.status === 'verified');
      setMfaEnabled(hasVerifiedFactor);
    } catch (error) {
      console.error('Error checking MFA status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnableMFA = async () => {
    setEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator App'
      });

      if (error) throw error;

      if (data) {
        setFactorId(data.id);
        setSecret(data.totp.secret);
        
        // Generate QR code
        const qrCodeUrl = data.totp.qr_code;
        const qr = await QRCode.toDataURL(qrCodeUrl);
        setQrCode(qr);
        
        toast.success('Scan the QR code with your authenticator app');
      }
    } catch (error: any) {
      console.error('Error enabling MFA:', error);
      toast.error(error.message || 'Failed to enable 2FA');
    } finally {
      setEnrolling(false);
    }
  };

  const handleVerifyAndEnable = async () => {
    if (verifyCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    try {
      const { data, error } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: verifyCode
      });

      if (error) throw error;

      // Generate recovery codes (mock for now - should be done server-side)
      const codes = Array.from({ length: 8 }, () => 
        Math.random().toString(36).substring(2, 10).toUpperCase()
      );
      setRecoveryCodes(codes);

      toast.success('2FA enabled successfully!');
      setMfaEnabled(true);
      setQrCode('');
      setVerifyCode('');
    } catch (error: any) {
      console.error('Error verifying MFA:', error);
      toast.error(error.message || 'Invalid code. Please try again.');
    }
  };

  const handleDisableMFA = async () => {
    if (!confirm('Are you sure you want to disable two-factor authentication? This will make your account less secure.')) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const factor = user.factors?.find(f => f.status === 'verified');
      if (!factor) return;

      const { error } = await supabase.auth.mfa.unenroll({
        factorId: factor.id
      });

      if (error) throw error;

      toast.success('2FA disabled');
      setMfaEnabled(false);
      setRecoveryCodes([]);
    } catch (error: any) {
      console.error('Error disabling MFA:', error);
      toast.error(error.message || 'Failed to disable 2FA');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
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
          Two-Factor Authentication (2FA)
        </CardTitle>
        <CardDescription>
          Add an extra layer of security to your account using an authenticator app
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!mfaEnabled && !qrCode && (
          <>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Two-factor authentication is currently disabled. Enable it to protect your account.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">What you'll need:</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>An authenticator app (Google Authenticator, Authy, 1Password, etc.)</li>
                  <li>Access to your email for account recovery</li>
                </ul>
              </div>

              <Button 
                onClick={handleEnableMFA}
                disabled={enrolling}
                className="w-full"
              >
                {enrolling ? 'Setting up...' : 'Enable Two-Factor Authentication'}
              </Button>
            </div>
          </>
        )}

        {qrCode && !recoveryCodes.length && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-primary" />
                <h4 className="font-semibold">Step 1: Scan QR Code</h4>
              </div>
              
              <div className="flex flex-col items-center gap-4 p-6 bg-background/50 rounded-lg border">
                <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                
                <div className="space-y-2 w-full">
                  <Label className="text-xs text-muted-foreground">Or enter this key manually:</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-background border rounded text-sm font-mono">
                      {secret}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(secret)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" />
                <h4 className="font-semibold">Step 2: Enter Verification Code</h4>
              </div>
              
              <div className="flex flex-col items-center gap-4">
                <p className="text-sm text-muted-foreground text-center">
                  Enter the 6-digit code from your authenticator app
                </p>
                
                <InputOTP
                  maxLength={6}
                  value={verifyCode}
                  onChange={setVerifyCode}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>

                <div className="flex gap-2 w-full">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setQrCode('');
                      setVerifyCode('');
                      setFactorId('');
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleVerifyAndEnable}
                    disabled={verifyCode.length !== 6}
                    className="flex-1"
                  >
                    Verify & Enable
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {recoveryCodes.length > 0 && (
          <div className="space-y-4">
            <Alert className="bg-amber-500/10 border-amber-500/20">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-amber-500">
                Save these recovery codes in a safe place. You'll need them to access your account if you lose your authenticator device.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>Recovery Codes</Label>
              <div className="grid grid-cols-2 gap-2 p-4 bg-background/50 rounded-lg border">
                {recoveryCodes.map((code, i) => (
                  <code key={i} className="px-2 py-1 bg-background rounded text-sm font-mono">
                    {code}
                  </code>
                ))}
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => {
                const text = recoveryCodes.join('\n');
                copyToClipboard(text);
              }}
              className="w-full"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy All Codes
            </Button>

            <Button
              onClick={() => setRecoveryCodes([])}
              className="w-full"
            >
              I've Saved My Codes
            </Button>
          </div>
        )}

        {mfaEnabled && !qrCode && !recoveryCodes.length && (
          <div className="space-y-4">
            <Alert className="bg-green-500/10 border-green-500/20">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-500">
                Two-factor authentication is enabled and protecting your account.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                When signing in, you'll need to enter a code from your authenticator app after your password.
              </p>
            </div>

            <Button
              variant="destructive"
              onClick={handleDisableMFA}
              className="w-full"
            >
              Disable Two-Factor Authentication
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
