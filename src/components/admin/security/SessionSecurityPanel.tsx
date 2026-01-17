import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Monitor, 
  AlertTriangle, 
  XCircle, 
  Search, 
  MapPin, 
  Clock,
  Users,
  Globe,
  Smartphone
} from 'lucide-react';
import { 
  useActiveSessions, 
  useSuspiciousSessions, 
  useTerminateSession,
  useTerminateAllUserSessions,
  useSessionStats,
  UserSession
} from '@/hooks/useSessionSecurity';
import { formatDistanceToNow } from 'date-fns';
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

export function SessionSecurityPanel() {
  const { data: activeSessions, isLoading: activeLoading } = useActiveSessions();
  const { data: suspiciousSessions, isLoading: suspiciousLoading } = useSuspiciousSessions();
  const { data: stats } = useSessionStats();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredActive = activeSessions?.filter(session =>
    session.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    session.ip_address?.includes(searchQuery) ||
    session.country?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard
          title="Active Sessions"
          value={stats?.activeSessions ?? 0}
          icon={<Users className="h-5 w-5 text-primary" />}
        />
        <StatsCard
          title="Suspicious Sessions"
          value={stats?.suspiciousSessions ?? 0}
          icon={<AlertTriangle className="h-5 w-5 text-destructive" />}
          variant="destructive"
        />
        <StatsCard
          title="Countries"
          value={stats?.uniqueCountries ?? 0}
          icon={<Globe className="h-5 w-5 text-blue-500" />}
        />
      </div>

      {/* Sessions Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              All Active
            </TabsTrigger>
            <TabsTrigger value="suspicious" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Suspicious
              {(stats?.suspiciousSessions ?? 0) > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 justify-center">
                  {stats?.suspiciousSessions}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by email, IP, country..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <TabsContent value="all">
          <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Active Sessions</CardTitle>
              <CardDescription>
                Currently active user sessions across the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {filteredActive?.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No active sessions found
                      </p>
                    ) : (
                      filteredActive?.map((session) => (
                        <SessionRow key={session.id} session={session} />
                      ))
                    )}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suspicious">
          <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30 border-destructive/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Suspicious Sessions
              </CardTitle>
              <CardDescription>
                Sessions flagged for unusual activity patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              {suspiciousLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {suspiciousSessions?.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No suspicious sessions detected
                      </p>
                    ) : (
                      suspiciousSessions?.map((session) => (
                        <SessionRow key={session.id} session={session} showReason />
                      ))
                    )}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatsCard({ 
  title, 
  value, 
  icon,
  variant = 'default'
}: { 
  title: string; 
  value: number; 
  icon: React.ReactNode;
  variant?: 'default' | 'destructive';
}) {
  return (
    <Card className={`bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30 ${
      variant === 'destructive' && value > 0 ? 'border-destructive/30' : ''
    }`}>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="p-2 rounded-lg bg-muted/50">
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SessionRow({ session, showReason = false }: { session: UserSession; showReason?: boolean }) {
  const terminateSession = useTerminateSession();
  const terminateAllUserSessions = useTerminateAllUserSessions();

  const parseUserAgent = (ua: string | null) => {
    if (!ua) return 'Unknown Device';
    if (ua.includes('Mobile')) return 'Mobile';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    return 'Browser';
  };

  return (
    <div className={`p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors ${
      session.is_suspicious ? 'border border-destructive/30' : ''
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium truncate">{session.user_email}</p>
            {session.is_suspicious && (
              <Badge variant="destructive" className="text-xs">Suspicious</Badge>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 font-mono">
              {session.ip_address || 'Unknown IP'}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {session.city ? `${session.city}, ` : ''}{session.country || 'Unknown'}
            </span>
            <span className="flex items-center gap-1">
              <Smartphone className="h-3 w-3" />
              {parseUserAgent(session.user_agent)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Active {session.last_activity ? formatDistanceToNow(new Date(session.last_activity), { addSuffix: true }) : 'Unknown'}
            </span>
          </div>

          {showReason && session.suspicious_reason && (
            <p className="mt-2 text-xs text-destructive bg-destructive/10 px-2 py-1 rounded">
              {session.suspicious_reason}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Kill
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Terminate Session</AlertDialogTitle>
                <AlertDialogDescription>
                  This will immediately terminate this session. The user will be logged out and need to sign in again.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => terminateSession.mutate(session.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Terminate Session
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
              >
                Kill All
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Terminate All User Sessions</AlertDialogTitle>
                <AlertDialogDescription>
                  This will terminate ALL active sessions for {session.user_email}. They will need to sign in again on all devices.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => session.user_id && terminateAllUserSessions.mutate(session.user_id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Terminate All Sessions
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
