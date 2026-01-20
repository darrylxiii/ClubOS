import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  AlertTriangle, 
  Shield, 
  CheckCircle, 
  Ban, 
  Eye,
  Clock,
  MapPin,
  User,
  Mail
} from 'lucide-react';
import { useThreatEvents, useResolveThreat, useBlockIP } from '@/hooks/useThreatDetection';
import { ThreatEvent, ThreatSeverity } from '@/types/threat';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

const severityConfig: Record<ThreatSeverity, { color: string; bgColor: string; icon: typeof AlertTriangle }> = {
  critical: { color: 'text-red-500', bgColor: 'bg-red-500/10 border-red-500/20', icon: AlertTriangle },
  high: { color: 'text-orange-500', bgColor: 'bg-orange-500/10 border-orange-500/20', icon: AlertTriangle },
  medium: { color: 'text-yellow-500', bgColor: 'bg-yellow-500/10 border-yellow-500/20', icon: Shield },
  low: { color: 'text-blue-500', bgColor: 'bg-blue-500/10 border-blue-500/20', icon: Shield },
};

export function ActiveThreatsPanel() {
  const { data: threats, isLoading } = useThreatEvents(20);
  const resolveThreat = useResolveThreat();
  const blockIP = useBlockIP();
  
  const [selectedThreat, setSelectedThreat] = useState<ThreatEvent | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const activeThreats = threats?.filter(t => !t.is_resolved) || [];

  const handleResolve = async () => {
    if (!selectedThreat) return;
    await resolveThreat.mutateAsync({ 
      id: selectedThreat.id, 
      resolution_notes: resolutionNotes 
    });
    setShowDetails(false);
    setSelectedThreat(null);
    setResolutionNotes('');
  };

  const handleBlock = async (ip: string) => {
    await blockIP.mutateAsync({
      ip_address: ip,
      reason: 'Blocked from threat panel',
      expires_hours: 24
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Threats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Active Threats
            </span>
            <Badge variant={activeThreats.length > 0 ? "destructive" : "secondary"}>
              {activeThreats.length} active
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {activeThreats.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mb-2 text-green-500" />
                <span>No active threats</span>
              </div>
            ) : (
              <div className="space-y-3">
                {activeThreats.map((threat) => {
                  const config = severityConfig[threat.severity];
                  const Icon = config.icon;
                  
                  return (
                    <div
                      key={threat.id}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50",
                        config.bgColor
                      )}
                      onClick={() => {
                        setSelectedThreat(threat);
                        setShowDetails(true);
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <Icon className={cn("h-5 w-5 mt-0.5", config.color)} />
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={cn("text-xs", config.color)}>
                                {threat.severity.toUpperCase()}
                              </Badge>
                              <Badge variant="secondary" className="text-xs capitalize">
                                {threat.event_type.replace('_', ' ')}
                              </Badge>
                            </div>
                            <p className="text-sm mt-1">{threat.description}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              {threat.ip_address && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {threat.ip_address}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDistanceToNow(new Date(threat.created_at), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedThreat(threat);
                              setShowDetails(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {threat.ip_address && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleBlock(threat.ip_address!);
                              }}
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Threat Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Threat Details</DialogTitle>
            <DialogDescription>
              Review and resolve this security threat
            </DialogDescription>
          </DialogHeader>
          
          {selectedThreat && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Type</span>
                  <p className="font-medium capitalize">{selectedThreat.event_type.replace('_', ' ')}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Severity</span>
                  <Badge className={severityConfig[selectedThreat.severity].color}>
                    {selectedThreat.severity.toUpperCase()}
                  </Badge>
                </div>
              </div>

              <div>
                <span className="text-sm text-muted-foreground">Description</span>
                <p>{selectedThreat.description}</p>
              </div>

              {selectedThreat.ip_address && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedThreat.ip_address}</span>
                </div>
              )}

              {selectedThreat.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedThreat.email}</span>
                </div>
              )}

              {selectedThreat.attack_details && Object.keys(selectedThreat.attack_details).length > 0 && (
                <div>
                  <span className="text-sm text-muted-foreground">Attack Details</span>
                  <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto">
                    {JSON.stringify(selectedThreat.attack_details, null, 2)}
                  </pre>
                </div>
              )}

              <div>
                <span className="text-sm text-muted-foreground">Resolution Notes</span>
                <Input
                  placeholder="Add notes about how this was resolved..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            {selectedThreat?.ip_address && (
              <Button
                variant="outline"
                className="text-destructive border-destructive hover:bg-destructive/10"
                onClick={() => handleBlock(selectedThreat.ip_address!)}
                disabled={blockIP.isPending}
              >
                <Ban className="h-4 w-4 mr-2" />
                Block IP
              </Button>
            )}
            <Button
              onClick={handleResolve}
              disabled={resolveThreat.isPending}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark Resolved
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
