import { useState } from 'react';
import { AlertTriangle, Power, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useMaintenanceMode } from '@/hooks/useMaintenanceMode';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function MaintenanceModeToggle() {
  const { config, isMaintenanceMode, toggleMaintenanceMode, isLoading } = useMaintenanceMode();
  const [message, setMessage] = useState(config.message || '');
  const [eta, setEta] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const handleToggle = async () => {
    if (!isMaintenanceMode) {
      setShowConfirm(true);
    } else {
      await toggleMaintenanceMode(false);
    }
  };

  const confirmEnable = async () => {
    const etaDate = eta ? new Date(eta) : undefined;
    await toggleMaintenanceMode(true, message, etaDate);
    setShowConfirm(false);
  };

  return (
    <Card className={isMaintenanceMode ? 'border-orange-500/50 bg-orange-500/5' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isMaintenanceMode ? 'bg-orange-500/20' : 'bg-muted'}`}>
              <Power className={`h-5 w-5 ${isMaintenanceMode ? 'text-orange-500' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <CardTitle className="text-lg">Maintenance Mode</CardTitle>
              <CardDescription>
                Block all user access except admins
              </CardDescription>
            </div>
          </div>
          <Switch
            checked={isMaintenanceMode}
            onCheckedChange={handleToggle}
            disabled={isLoading}
          />
        </div>
      </CardHeader>

      {isMaintenanceMode && (
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-orange-500/10 border border-orange-500/20 p-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-orange-500">Platform is in maintenance mode</p>
                <p className="text-muted-foreground mt-1">
                  Regular users will see a maintenance page. Only admins can access the platform.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Current Message</Label>
              <p className="text-sm text-muted-foreground">
                {config.message || 'No message set'}
              </p>
            </div>

            {config.eta && (
              <div className="space-y-2">
                <Label>Estimated Completion</Label>
                <p className="text-sm text-muted-foreground">
                  {new Date(config.eta).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      )}

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Enable Maintenance Mode?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will block all non-admin users from accessing the platform.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="message">Status Message (shown to users)</Label>
              <Textarea
                id="message"
                placeholder="We're performing scheduled maintenance. Please check back soon."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="eta">Estimated Completion Time (optional)</Label>
              <Input
                id="eta"
                type="datetime-local"
                value={eta}
                onChange={(e) => setEta(e.target.value)}
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmEnable}
              className="bg-orange-500 hover:bg-orange-600"
            >
              Enable Maintenance Mode
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
