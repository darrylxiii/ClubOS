import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Lock, Shield } from 'lucide-react';
import { TwoFactorSettings } from '@/components/TwoFactorSettings';
import { AccountLinking } from '@/components/AccountLinking';

export const SecuritySettings = () => {
  return (
    <div className="space-y-4">
      <TwoFactorSettings />
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Password
          </CardTitle>
          <CardDescription>
            Update your password regularly to keep your account secure
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Change Password</Label>
            <p className="text-sm text-muted-foreground">
              You'll be signed out of all devices after changing your password
            </p>
            <Button variant="outline">
              Change Password
            </Button>
          </div>
        </CardContent>
      </Card>

      <AccountLinking />
    </div>
  );
};
