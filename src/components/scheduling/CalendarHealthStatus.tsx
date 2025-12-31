import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, RefreshCw, XCircle, Calendar, Unlink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CalendarConnection {
  id: string;
  provider: string;
  email: string | null;
  is_active: boolean;
  token_expired_at: string | null;
  last_error: string | null;
  error_count: number;
  updated_at: string;
}

export function CalendarHealthStatus() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reconnecting, setReconnecting] = useState<string | null>(null);

  const { data: connections, isLoading } = useQuery({
    queryKey: ["calendar-connections-health"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("calendar_connections")
        .select("id, provider, email, is_active, token_expired_at, last_error, error_count, updated_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CalendarConnection[];
    },
  });

  const removeConnectionMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      const { error } = await supabase
        .from("calendar_connections")
        .delete()
        .eq("id", connectionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-connections-health"] });
      toast({
        title: "Calendar disconnected",
        description: "The calendar connection has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to disconnect",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleReconnect = async (connection: CalendarConnection) => {
    setReconnecting(connection.id);
    
    try {
      // Trigger OAuth flow based on provider
      const authFunction = connection.provider === "google" 
        ? "google-calendar-auth" 
        : "microsoft-calendar-auth";
      
      const { data, error } = await supabase.functions.invoke(authFunction, {
        body: { action: "getAuthUrl", reconnectId: connection.id }
      });

      if (error) throw error;
      
      if (data?.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error: any) {
      toast({
        title: "Reconnection failed",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setReconnecting(null);
    }
  };

  const getStatusInfo = (connection: CalendarConnection) => {
    if (connection.token_expired_at) {
      return {
        status: "expired",
        color: "destructive" as const,
        icon: XCircle,
        label: "Token Expired",
        description: "Your calendar access has expired. Reconnect to restore sync.",
      };
    }
    if (connection.error_count >= 3) {
      return {
        status: "error",
        color: "destructive" as const,
        icon: AlertTriangle,
        label: "Connection Error",
        description: `Multiple sync failures detected. Last error: ${connection.last_error || "Unknown"}`,
      };
    }
    if (!connection.is_active) {
      return {
        status: "inactive",
        color: "secondary" as const,
        icon: XCircle,
        label: "Inactive",
        description: "This calendar connection is disabled.",
      };
    }
    if (connection.error_count > 0) {
      return {
        status: "warning",
        color: "secondary" as const,
        icon: AlertTriangle,
        label: "Warning",
        description: "Recent sync issues detected but connection is active.",
      };
    }
    return {
      status: "healthy",
      color: "default" as const,
      icon: CheckCircle,
      label: "Healthy",
      description: "Calendar sync is working properly.",
    };
  };

  const expiredConnections = connections?.filter(c => c.token_expired_at || c.error_count >= 3) || [];

  if (isLoading) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Alert banner for expired connections */}
      {expiredConnections.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Calendar Connection Issues</AlertTitle>
          <AlertDescription>
            {expiredConnections.length === 1
              ? "One of your calendar connections needs attention."
              : `${expiredConnections.length} calendar connections need attention.`}
            {" "}Reconnect to ensure bookings sync properly.
          </AlertDescription>
        </Alert>
      )}

      {/* Calendar health cards */}
      {connections && connections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5" />
              Calendar Connections
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {connections.map((connection) => {
              const statusInfo = getStatusInfo(connection);
              const StatusIcon = statusInfo.icon;
              const isReconnecting = reconnecting === connection.id;

              return (
                <div
                  key={connection.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <StatusIcon
                      className={`h-5 w-5 ${
                        statusInfo.status === "healthy"
                          ? "text-green-500"
                          : statusInfo.status === "warning"
                          ? "text-yellow-500"
                          : "text-destructive"
                      }`}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium capitalize">
                          {connection.provider}
                        </span>
                        <Badge variant={statusInfo.color}>
                          {statusInfo.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {connection.email || "No email"}
                      </p>
                      {statusInfo.status !== "healthy" && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {statusInfo.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {(statusInfo.status === "expired" || statusInfo.status === "error") && (
                      <Button
                        size="sm"
                        onClick={() => handleReconnect(connection)}
                        disabled={isReconnecting}
                      >
                        {isReconnecting ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        <span className="ml-2">Reconnect</span>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeConnectionMutation.mutate(connection.id)}
                      disabled={removeConnectionMutation.isPending}
                    >
                      <Unlink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
