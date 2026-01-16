import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Fingerprint, ScanFace, Eye, Shield, Clock, Smartphone } from 'lucide-react';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';
import { secureStorage } from '@/services/secureStorage';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function BiometricSettings() {
  const { isAvailable, biometryType, biometryName, isNative, authenticate } = useBiometricAuth();
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [autoLockTimeout, setAutoLockTimeout] = useState('5');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const BiometryIcon = biometryType === 'face' ? ScanFace : biometryType === 'fingerprint' ? Fingerprint : Eye;

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const enabled = await secureStorage.isBiometricEnabled();
      setBiometricEnabled(enabled);
    } catch (_error) {
      console.error('Error loading biometric settings:', _error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleBiometric = async (enabled: boolean) => {
    if (enabled && isAvailable) {
      const result = await authenticate('Enable biometric login');
      if (!result.success) {
        toast.error('Failed to verify biometrics');
        return;
      }
    }

    setIsSaving(true);
    try {
      await secureStorage.setBiometricEnabled(enabled);
      setBiometricEnabled(enabled);
      toast.success(enabled ? `${biometryName} enabled` : `${biometryName} disabled`);
    } catch (_error) {
      console.error('Error saving biometric settings:', _error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTimeoutChange = async (value: string) => {
    setAutoLockTimeout(value);
    toast.success('Auto-lock timeout updated');
  };

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-48" />
          <div className="h-4 bg-muted rounded w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="h-24 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Biometric Security</CardTitle>
              <CardDescription>Secure your account with biometric authentication</CardDescription>
            </div>
          </div>
          {isNative && (
            <Badge variant="outline" className="gap-1">
              <Smartphone className="h-3 w-3" />
              Native App
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className={cn(
          "flex items-center justify-between p-4 rounded-lg border",
          isAvailable ? "bg-card" : "bg-muted/50 opacity-60"
        )}>
          <div className="flex items-center gap-4">
            <div className={cn("h-12 w-12 rounded-full flex items-center justify-center", biometricEnabled ? "bg-primary/20" : "bg-muted")}>
              <BiometryIcon className={cn("h-6 w-6", biometricEnabled ? "text-primary" : "text-muted-foreground")} />
            </div>
            <div>
              <Label className="text-base font-medium">{biometryName}</Label>
              <p className="text-sm text-muted-foreground">
                {isAvailable ? `Use ${biometryName} to unlock the app` : `${biometryName} not available on this device`}
              </p>
            </div>
          </div>
          <Switch checked={biometricEnabled} onCheckedChange={handleToggleBiometric} disabled={!isAvailable || isSaving} />
        </div>

        {biometricEnabled && (
          <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <Clock className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <Label className="text-base font-medium">Auto-lock</Label>
                <p className="text-sm text-muted-foreground">Lock the app after inactivity</p>
              </div>
            </div>
            <Select value={autoLockTimeout} onValueChange={handleTimeoutChange}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 minute</SelectItem>
                <SelectItem value="5">5 minutes</SelectItem>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {biometricEnabled && isAvailable && (
          <Button variant="outline" className="w-full gap-2" onClick={async () => {
            const result = await authenticate('Test biometric authentication');
            toast[result.success ? 'success' : 'error'](result.success ? 'Authentication successful' : (result.errorMessage || 'Authentication failed'));
          }}>
            <BiometryIcon className="h-4 w-4" />
            Test {biometryName}
          </Button>
        )}

        <p className="text-xs text-muted-foreground">
          {isNative ? 'Your biometric data never leaves your device.' : 'Biometric authentication is only available in the native mobile app.'}
        </p>
      </CardContent>
    </Card>
  );
}
