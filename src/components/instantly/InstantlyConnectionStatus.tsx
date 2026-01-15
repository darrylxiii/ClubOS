import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface InstantlyConnectionStatusProps {
  lastSyncedAt: string | null;
  syncing: boolean;
  onSync: () => void;
}

export function InstantlyConnectionStatus({ 
  lastSyncedAt, 
  syncing, 
  onSync 
}: InstantlyConnectionStatusProps) {
  const [checking, setChecking] = useState(false);
  const [connected, setConnected] = useState<boolean | null>(null);

  const checkConnection = async () => {
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-instantly-analytics', {
        body: { test: true },
      });
      
      if (error) throw error;
      setConnected(true);
      toast.success('Connected to Instantly API');
    } catch (error) {
      setConnected(false);
      toast.error('Failed to connect to Instantly API');
    } finally {
      setChecking(false);
    }
  };

  const formatLastSync = (date: string | null) => {
    if (!date) return 'Never';
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border border-border/30"
    >
      <div className="flex items-center gap-2">
        {connected === true && (
          <div className="flex items-center gap-2 text-green-500">
            <Wifi className="h-5 w-5" />
            <span className="text-sm font-medium">Connected</span>
          </div>
        )}
        {connected === false && (
          <div className="flex items-center gap-2 text-red-500">
            <WifiOff className="h-5 w-5" />
            <span className="text-sm font-medium">Disconnected</span>
          </div>
        )}
        {connected === null && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Wifi className="h-5 w-5" />
            <span className="text-sm font-medium">Instantly API</span>
          </div>
        )}
      </div>

      <div className="h-6 w-px bg-border/50" />

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Last sync:</span>
        <span className="font-medium text-foreground">{formatLastSync(lastSyncedAt)}</span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={checkConnection}
          disabled={checking}
        >
          {checking ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          <span className="ml-2">Test</span>
        </Button>

        <Button
          size="sm"
          onClick={onSync}
          disabled={syncing}
          className="bg-gradient-to-r from-primary to-primary/80"
        >
          {syncing ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span className="ml-2">Sync Now</span>
        </Button>
      </div>
    </motion.div>
  );
}
