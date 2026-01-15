import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { WorldMap } from '@/components/ui/world-map';
import { useAttackGeoData, useCountryAttackStats } from '@/hooks/useAttackGeoData';
import { Globe, Shield, AlertTriangle, MapPin, Wifi } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// TQC Server location (Amsterdam, Netherlands)
const SERVER_LOCATION = { lat: 52.3676, lng: 4.9041 };

// Severity to color mapping
const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
};

const severityBadgeVariants = {
  critical: 'destructive' as const,
  high: 'destructive' as const,
  medium: 'secondary' as const,
  low: 'outline' as const,
};

export function AttackMap() {
  const { data: attackPoints, isLoading: isLoadingAttacks } = useAttackGeoData();
  const { data: countryStats, isLoading: isLoadingStats } = useCountryAttackStats();

  // Transform attack data to WorldMap format
  const attackDots = useMemo(() => {
    if (!attackPoints?.length) return [];
    
    // Take top 20 attacks to avoid visual clutter
    return attackPoints
      .filter(point => point.latitude && point.longitude)
      .slice(0, 20)
      .map(point => ({
        start: {
          lat: point.latitude!,
          lng: point.longitude!,
          label: point.severity === 'critical' || point.severity === 'high' 
            ? `${point.country || 'Unknown'} (${point.attack_count})` 
            : undefined,
        },
        end: {
          lat: SERVER_LOCATION.lat,
          lng: SERVER_LOCATION.lng,
        },
        color: SEVERITY_COLORS[point.severity] || SEVERITY_COLORS.low,
      }));
  }, [attackPoints]);

  // Calculate statistics
  const totalAttacks = useMemo(() => 
    attackPoints?.reduce((sum, p) => sum + p.attack_count, 0) || 0
  , [attackPoints]);

  const uniqueIPs = attackPoints?.length || 0;
  
  const criticalCount = useMemo(() => 
    attackPoints?.filter(p => p.severity === 'critical').length || 0
  , [attackPoints]);

  const topCountries = countryStats?.slice(0, 10) || [];

  if (isLoadingAttacks || isLoadingStats) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3">
          <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="w-full aspect-[2/1]" />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      {/* Main Map */}
      <div className="lg:col-span-3">
        <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50 overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Globe className="h-5 w-5 text-primary" />
                Live Attack Map
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1.5 animate-pulse" />
                  Live
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 relative">
            {/* Stats Overlay */}
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
              <div className="bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-border/50">
                <div className="text-xs text-muted-foreground">Total Attacks</div>
                <div className="text-xl font-bold text-foreground">{totalAttacks.toLocaleString()}</div>
              </div>
              <div className="bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-border/50">
                <div className="text-xs text-muted-foreground">Unique IPs</div>
                <div className="text-xl font-bold text-foreground">{uniqueIPs}</div>
              </div>
              {criticalCount > 0 && (
                <div className="bg-destructive/20 backdrop-blur-sm rounded-lg px-3 py-2 border border-destructive/30">
                  <div className="text-xs text-destructive">Critical Threats</div>
                  <div className="text-xl font-bold text-destructive">{criticalCount}</div>
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 z-10 bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-border/50">
              <div className="text-xs text-muted-foreground mb-2">Severity</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(SEVERITY_COLORS).map(([level, color]) => (
                  <div key={level} className="flex items-center gap-1">
                    <div 
                      className="w-2.5 h-2.5 rounded-full" 
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs capitalize text-foreground">{level}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Server Location Badge */}
            <div className="absolute top-4 right-4 z-10 bg-green-500/20 backdrop-blur-sm rounded-lg px-3 py-2 border border-green-500/30">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-500" />
                <div>
                  <div className="text-xs text-green-400">TQC Server</div>
                  <div className="text-xs text-green-300">Amsterdam, NL</div>
                </div>
              </div>
            </div>

            {/* World Map */}
            {attackDots.length > 0 ? (
              <WorldMap
                dots={attackDots}
                lineColor="#ef4444"
                showLabels={true}
                animationDuration={3}
                loop={true}
              />
            ) : (
              <div className="w-full aspect-[2/1] flex items-center justify-center bg-muted/20">
                <div className="text-center text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No attack data available</p>
                  <p className="text-sm">All systems secure</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Side Panel */}
      <div className="space-y-4">
        {/* Top Attack Origins */}
        <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="h-4 w-4 text-destructive" />
              Top Attack Origins
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topCountries.length > 0 ? (
              <div className="space-y-2">
                {topCountries.slice(0, 5).map((stat, index) => (
                  <div key={stat.country_code} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getCountryFlag(stat.country_code)}</span>
                      <span className="text-sm font-medium">{stat.country}</span>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={
                        stat.attack_count > 100 
                          ? 'bg-destructive/10 text-destructive border-destructive/30'
                          : stat.attack_count > 50
                          ? 'bg-orange-500/10 text-orange-500 border-orange-500/30'
                          : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'
                      }
                    >
                      {stat.attack_count}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No attack origins detected</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Attack Details */}
        <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Recent Attacks
            </CardTitle>
          </CardHeader>
          <CardContent>
            {attackPoints && attackPoints.length > 0 ? (
              <div className="space-y-3 max-h-[280px] overflow-y-auto">
                {attackPoints.slice(0, 6).map((point) => (
                  <div key={point.id} className="flex items-start gap-2 text-sm">
                    <div 
                      className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                      style={{ backgroundColor: SEVERITY_COLORS[point.severity] }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium font-mono text-xs truncate">{point.ip_address}</span>
                        <Badge variant="outline" className="text-xs flex-shrink-0">
                          {point.attack_count}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {point.city ? `${point.city}, ` : ''}{point.country || 'Unknown'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(point.last_attack), { addSuffix: true })}
                      </div>
                      {(point.is_vpn || point.is_proxy || point.is_tor) && (
                        <div className="flex gap-1 mt-1">
                          {point.is_vpn && <Badge variant="secondary" className="text-[10px] py-0"><Shield className="h-2 w-2 mr-0.5" />VPN</Badge>}
                          {point.is_proxy && <Badge variant="secondary" className="text-[10px] py-0">Proxy</Badge>}
                          {point.is_tor && <Badge variant="secondary" className="text-[10px] py-0 text-orange-500"><Wifi className="h-2 w-2 mr-0.5" />TOR</Badge>}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No recent attacks</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function getCountryFlag(countryCode: string): string {
  try {
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  } catch {
    return '🌍';
  }
}
