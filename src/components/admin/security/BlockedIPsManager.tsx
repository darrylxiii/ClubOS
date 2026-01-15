import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Ban, Plus, Trash2, Clock, Shield } from 'lucide-react';
import { useBlockedIPs, useBlockIP, useUnblockIP } from '@/hooks/useThreatDetection';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const blockTypeLabels: Record<string, { label: string; color: string }> = {
  manual: { label: 'Manual', color: 'bg-blue-500' },
  auto_brute_force: { label: 'Brute Force', color: 'bg-red-500' },
  auto_rate_limit: { label: 'Rate Limit', color: 'bg-orange-500' },
  auto_suspicious: { label: 'Suspicious', color: 'bg-yellow-500' },
  auto_enumeration: { label: 'Enumeration', color: 'bg-purple-500' },
};

export function BlockedIPsManager() {
  const { data: blockedIPs, isLoading } = useBlockedIPs();
  const blockIP = useBlockIP();
  const unblockIP = useUnblockIP();
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newIP, setNewIP] = useState('');
  const [reason, setReason] = useState('');
  const [expiresHours, setExpiresHours] = useState<string>('24');

  const handleBlock = async () => {
    if (!newIP.trim()) return;
    
    await blockIP.mutateAsync({
      ip_address: newIP.trim(),
      reason: reason.trim() || 'Manually blocked',
      expires_hours: expiresHours === 'permanent' ? undefined : parseInt(expiresHours)
    });
    
    setShowAddDialog(false);
    setNewIP('');
    setReason('');
    setExpiresHours('24');
  };

  const handleUnblock = async (id: string) => {
    await unblockIP.mutateAsync(id);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Blocked IPs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Ban className="h-5 w-5" />
            Blocked IPs
          </span>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Block IP
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Block IP Address</DialogTitle>
                <DialogDescription>
                  Manually block an IP address from accessing the platform
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="ip">IP Address</Label>
                  <Input
                    id="ip"
                    placeholder="192.168.1.1"
                    value={newIP}
                    onChange={(e) => setNewIP(e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="reason">Reason</Label>
                  <Input
                    id="reason"
                    placeholder="Reason for blocking..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="expires">Block Duration</Label>
                  <Select value={expiresHours} onValueChange={setExpiresHours}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 hour</SelectItem>
                      <SelectItem value="6">6 hours</SelectItem>
                      <SelectItem value="24">24 hours</SelectItem>
                      <SelectItem value="168">1 week</SelectItem>
                      <SelectItem value="720">30 days</SelectItem>
                      <SelectItem value="permanent">Permanent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleBlock} disabled={!newIP.trim() || blockIP.isPending}>
                  <Ban className="h-4 w-4 mr-2" />
                  Block IP
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          {!blockedIPs?.length ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Shield className="h-8 w-8 mb-2" />
              <span>No blocked IPs</span>
            </div>
          ) : (
            <div className="space-y-2">
              {blockedIPs.map((block) => {
                const typeConfig = blockTypeLabels[block.block_type] || { label: block.block_type, color: 'bg-gray-500' };
                const isExpired = block.expires_at && new Date(block.expires_at) < new Date();
                
                return (
                  <div
                    key={block.id}
                    className={cn(
                      "p-3 rounded-lg border flex items-center justify-between",
                      isExpired && "opacity-50"
                    )}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <code className="font-mono text-sm bg-muted px-2 py-0.5 rounded">
                          {block.ip_address}
                        </code>
                        <Badge className={cn("text-xs text-white", typeConfig.color)}>
                          {typeConfig.label}
                        </Badge>
                        {block.expires_at && (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {isExpired ? 'Expired' : `Expires ${formatDistanceToNow(new Date(block.expires_at), { addSuffix: true })}`}
                          </Badge>
                        )}
                        {!block.expires_at && (
                          <Badge variant="destructive" className="text-xs">
                            Permanent
                          </Badge>
                        )}
                      </div>
                      {block.reason && (
                        <p className="text-sm text-muted-foreground mt-1">{block.reason}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>Blocked {formatDistanceToNow(new Date(block.blocked_at), { addSuffix: true })}</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleUnblock(block.id)}
                      disabled={unblockIP.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
