import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Globe, MapPin, AlertTriangle, Shield, Wifi } from 'lucide-react';
import { useAttackGeoData, useCountryAttackStats, AttackGeoPoint } from '@/hooks/useAttackGeoData';
import { formatDistanceToNow } from 'date-fns';

const severityColors = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-500',
};

const severityBadgeVariants = {
  critical: 'destructive' as const,
  high: 'destructive' as const,
  medium: 'secondary' as const,
  low: 'outline' as const,
};

export function AttackMap() {
  const { data: attackPoints, isLoading: pointsLoading } = useAttackGeoData();
  const { data: countryStats, isLoading: statsLoading } = useCountryAttackStats();

  const mapPoints = useMemo(() => {
    if (!attackPoints) return [];
    return attackPoints.map(point => ({
      ...point,
      // Convert lat/lng to approximate percentage positions on SVG
      x: ((point.longitude || 0) + 180) / 360 * 100,
      y: (90 - (point.latitude || 0)) / 180 * 100,
    }));
  }, [attackPoints]);

  const topCountries = countryStats?.slice(0, 10) || [];

  if (pointsLoading || statsLoading) {
    return (
      <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
        <CardContent className="flex items-center justify-center h-96">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* World Map Visualization */}
      <Card className="lg:col-span-2 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Global Attack Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative w-full aspect-[2/1] bg-muted/30 rounded-lg overflow-hidden">
            {/* Simple World Map SVG */}
            <svg
              viewBox="0 0 100 50"
              className="w-full h-full"
              preserveAspectRatio="xMidYMid slice"
            >
              {/* Ocean background */}
              <rect width="100" height="50" fill="hsl(var(--muted) / 0.3)" />
              
              {/* Simplified continent shapes */}
              <g fill="hsl(var(--muted-foreground) / 0.2)" stroke="hsl(var(--border))" strokeWidth="0.1">
                {/* North America */}
                <path d="M10,8 L25,8 L28,15 L25,22 L18,25 L12,22 L8,15 Z" />
                {/* South America */}
                <path d="M20,28 L28,28 L30,35 L25,45 L18,42 L17,32 Z" />
                {/* Europe */}
                <path d="M45,10 L55,8 L58,12 L55,18 L48,18 L45,14 Z" />
                {/* Africa */}
                <path d="M45,20 L55,18 L60,28 L55,42 L48,42 L42,30 Z" />
                {/* Asia */}
                <path d="M58,8 L85,6 L92,18 L85,28 L70,30 L60,22 L55,12 Z" />
                {/* Australia */}
                <path d="M78,35 L90,33 L92,42 L85,45 L78,42 Z" />
              </g>

              {/* Attack Points */}
              {mapPoints.map((point, index) => (
                <g key={point.id}>
                  {/* Pulse animation */}
                  <circle
                    cx={point.x / 2}
                    cy={point.y / 2}
                    r="1.5"
                    className={`${severityColors[point.severity]} opacity-30`}
                  >
                    <animate
                      attributeName="r"
                      from="0.5"
                      to="2"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      from="0.5"
                      to="0"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                  {/* Main point */}
                  <circle
                    cx={point.x / 2}
                    cy={point.y / 2}
                    r="0.5"
                    className={severityColors[point.severity]}
                  />
                </g>
              ))}
            </svg>

            {/* Legend */}
            <div className="absolute bottom-2 left-2 flex gap-2 bg-background/80 backdrop-blur-sm rounded-md px-2 py-1">
              <div className="flex items-center gap-1 text-xs">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-muted-foreground">Critical</span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                <span className="text-muted-foreground">High</span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <span className="text-muted-foreground">Medium</span>
              </div>
            </div>

            {/* Stats overlay */}
            <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-md px-3 py-2">
              <div className="text-xs text-muted-foreground">Active Threats</div>
              <div className="text-2xl font-bold text-foreground">{attackPoints?.length || 0}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Countries */}
      <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4 text-primary" />
            Top Attack Origins
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[280px]">
            <div className="space-y-2">
              {topCountries.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No attack data available
                </p>
              ) : (
                topCountries.map((country, index) => (
                  <div
                    key={country.country_code}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getCountryFlag(country.country_code)}</span>
                      <div>
                        <p className="text-sm font-medium">{country.country}</p>
                        <p className="text-xs text-muted-foreground">
                          {country.unique_ips} unique IPs
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{country.attack_count}</p>
                      <p className="text-xs text-muted-foreground">attacks</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Recent Attacks List */}
      <Card className="lg:col-span-3 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Recent Attack Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {attackPoints?.slice(0, 15).map((point) => (
                <AttackPointRow key={point.id} point={point} />
              ))}
              {(!attackPoints || attackPoints.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No recent attacks detected
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function AttackPointRow({ point }: { point: AttackGeoPoint }) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <Badge variant={severityBadgeVariants[point.severity]} className="w-16 justify-center">
          {point.severity}
        </Badge>
        <div>
          <p className="text-sm font-mono">{point.ip_address}</p>
          <p className="text-xs text-muted-foreground">
            {point.city ? `${point.city}, ` : ''}{point.country || 'Unknown'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          {point.is_vpn && (
            <Badge variant="outline" className="text-xs">
              <Shield className="h-3 w-3 mr-1" />VPN
            </Badge>
          )}
          {point.is_tor && (
            <Badge variant="outline" className="text-xs text-orange-500 border-orange-500">
              <Wifi className="h-3 w-3 mr-1" />TOR
            </Badge>
          )}
        </div>
        <div className="text-right">
          <p className="text-sm font-medium">{point.attack_count} attacks</p>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(point.last_attack), { addSuffix: true })}
          </p>
        </div>
      </div>
    </div>
  );
}

function getCountryFlag(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
