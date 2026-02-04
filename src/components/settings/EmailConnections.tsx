import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Mail, Trash2, AtSign } from "lucide-react";
import { format } from "date-fns";

interface EmailConnection {
  id: string;
  provider: 'gmail' | 'outlook' | 'private';
  email: string;
  label: string;
  is_active: boolean;
  sync_enabled: boolean;
  last_sync_at: string | null;
  created_at: string;
  scopes?: string[];
}

interface EmailConnectionsProps {
  emailConnections: EmailConnection[];
  onConnectGmail: () => void;
  onConnectOutlook: () => void;
  onToggleSync: (id: string, enabled: boolean) => void;
  onDisconnect: (id: string) => void;
  loading: boolean;
}

export function EmailConnections({
  emailConnections,
  onConnectGmail,
  onConnectOutlook,
  onToggleSync,
  onDisconnect,
  loading,
}: EmailConnectionsProps) {
  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'gmail':
        return <Mail className="h-5 w-5 text-red-500" />;
      case 'outlook':
        return <AtSign className="h-5 w-5 text-blue-500" />;
      default:
        return <Mail className="h-5 w-5" />;
    }
  };

  const getProviderName = (provider: string) => {
    switch (provider) {
      case 'gmail':
        return 'Gmail';
      case 'outlook':
        return 'Outlook';
      case 'private':
        return 'Private Email';
      default:
        return provider;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Connections</CardTitle>
        <CardDescription>
          Connect your email accounts to access them across the platform
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connected Emails */}
        {emailConnections.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Connected Accounts</h3>
            {emailConnections.map((connection) => (
              <div
                key={connection.id}
                className="flex items-center justify-between p-4 border rounded-lg bg-card"
              >
                <div className="flex items-center gap-3 flex-1">
                  {getProviderIcon(connection.provider)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{connection.label}</p>
                      <Badge variant="secondary" className="text-xs">
                        {getProviderName(connection.provider)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {connection.email}
                    </p>
                    {connection.last_sync_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Last synced: {format(new Date(connection.last_sync_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Sync</span>
                    <Switch
                      checked={connection.sync_enabled}
                      onCheckedChange={(checked) => onToggleSync(connection.id, checked)}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDisconnect(connection.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Email Buttons */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Add Email Account</h3>
          <div className="grid gap-3">
            <Button
              onClick={onConnectGmail}
              disabled={loading}
              variant="outline"
              className="justify-start gap-3 h-auto p-4"
            >
              <Mail className="h-5 w-5 text-red-500" />
              <div className="text-left">
                <p className="font-medium">Connect Gmail</p>
                <p className="text-xs text-muted-foreground">
                  Access your Google email account
                </p>
              </div>
            </Button>

            <Button
              onClick={onConnectOutlook}
              disabled={loading}
              variant="outline"
              className="justify-start gap-3 h-auto p-4"
            >
              <AtSign className="h-5 w-5 text-blue-500" />
              <div className="text-left">
                <p className="font-medium">Connect Outlook</p>
                <p className="text-xs text-muted-foreground">
                  Access your Microsoft email account
                </p>
              </div>
            </Button>

            <Button
              disabled
              variant="outline"
              className="justify-start gap-3 h-auto p-4 opacity-60"
            >
              <Mail className="h-5 w-5" />
              <div className="text-left flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">Connect Private Email</p>
                  <Badge variant="secondary" className="text-xs">
                    Coming Soon
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  IMAP/SMTP configuration for any email provider
                </p>
              </div>
            </Button>
          </div>
        </div>

        {emailConnections.length === 0 && !loading && (
          <div className="text-center py-8 text-muted-foreground">
            <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No email accounts connected yet</p>
            <p className="text-xs mt-1">Connect Gmail or Outlook to get started</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
