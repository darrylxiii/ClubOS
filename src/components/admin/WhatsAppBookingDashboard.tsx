/**
 * WhatsApp Booking Dashboard Component
 * 
 * Admin dashboard to monitor and test WhatsApp booking sessions
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MessageCircle, 
  Send, 
  Clock, 
  CheckCircle2, 
  XCircle,
  RefreshCw,
  Phone,
  User,
  Calendar
} from 'lucide-react';
import { useWhatsAppBooking } from '@/hooks/useWhatsAppBooking';
import { cn } from '@/lib/utils';

export function WhatsAppBookingDashboard() {
  const {
    sessions,
    isLoading,
    fetchSessions,
    simulateMessage,
    expireSession,
  } = useWhatsAppBooking();

  const [testPhone, setTestPhone] = useState('+31612345678');
  const [testMessage, setTestMessage] = useState('');
  const [testLanguage, setTestLanguage] = useState<'en' | 'nl'>('en');
  const [testResponse, setTestResponse] = useState<string>('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleSendTest = async () => {
    if (!testMessage.trim()) return;
    
    setIsSending(true);
    const result = await simulateMessage(testPhone, testMessage, undefined, testLanguage);
    setIsSending(false);
    
    if (result?.response) {
      setTestResponse(result.response);
      setTestMessage('');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500">Active</Badge>;
      case 'awaiting_confirmation':
        return <Badge variant="default" className="bg-yellow-500">Confirming</Badge>;
      case 'completed':
        return <Badge variant="secondary">Completed</Badge>;
      case 'expired':
        return <Badge variant="outline">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const activeSessions = sessions.filter(s => 
    s.status === 'active' || s.status === 'awaiting_confirmation'
  );
  const completedSessions = sessions.filter(s => s.status === 'completed');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-green-500" />
            WhatsApp Booking
          </h1>
          <p className="text-muted-foreground">
            Monitor and test WhatsApp booking sessions
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={fetchSessions}
          disabled={isLoading}
          className="gap-2"
        >
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-500/10">
                <MessageCircle className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeSessions.length}</p>
                <p className="text-sm text-muted-foreground">Active Sessions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedSessions.length}</p>
                <p className="text-sm text-muted-foreground">Bookings Made</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-muted">
                <Clock className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{sessions.length}</p>
                <p className="text-sm text-muted-foreground">Total Sessions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test Console */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Test Console</CardTitle>
            <CardDescription>
              Simulate WhatsApp messages for testing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Phone number"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                className="w-40"
              />
              <Button
                variant={testLanguage === 'en' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTestLanguage('en')}
              >
                EN
              </Button>
              <Button
                variant={testLanguage === 'nl' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTestLanguage('nl')}
              >
                NL
              </Button>
            </div>

            {/* Conversation Display */}
            <ScrollArea className="h-48 rounded-lg border bg-muted/30 p-3">
              {testResponse ? (
                <div className="space-y-2">
                  <div className="text-sm p-2 rounded-lg bg-background border max-w-[85%]">
                    {testResponse}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Send a message to start a test conversation
                </p>
              )}
            </ScrollArea>

            <div className="flex gap-2">
              <Input
                placeholder="Type a message..."
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendTest()}
              />
              <Button 
                onClick={handleSendTest}
                disabled={isSending || !testMessage.trim()}
              >
                {isSending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTestMessage('Hi, I want to book a meeting')}
              >
                Book meeting
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTestMessage('Tomorrow at 2pm')}
              >
                Tomorrow 2pm
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTestMessage('My email is test@example.com')}
              >
                Add email
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTestMessage('yes')}
              >
                Confirm
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Active Sessions List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sessions</CardTitle>
            <CardDescription>
              Recent WhatsApp booking sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="active">
              <TabsList className="mb-4">
                <TabsTrigger value="active">
                  Active ({activeSessions.length})
                </TabsTrigger>
                <TabsTrigger value="completed">
                  Completed ({completedSessions.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="active">
                <ScrollArea className="h-72">
                  {activeSessions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No active sessions
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {activeSessions.map((session) => (
                        <div
                          key={session.id}
                          className="p-3 rounded-lg border space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <span className="font-mono text-sm">
                                {session.phone_number}
                              </span>
                            </div>
                            {getStatusBadge(session.status)}
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            {session.extracted_data?.guest_name && (
                              <p className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {session.extracted_data.guest_name}
                              </p>
                            )}
                            {session.extracted_data?.preferred_date && (
                              <p className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {session.extracted_data.preferred_date}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-destructive"
                            onClick={() => expireSession(session.id)}
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Expire Session
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="completed">
                <ScrollArea className="h-72">
                  {completedSessions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No completed sessions
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {completedSessions.map((session) => (
                        <div
                          key={session.id}
                          className="p-3 rounded-lg border bg-muted/30"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-sm">
                              {session.phone_number}
                            </span>
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {session.extracted_data?.guest_name} • 
                            {new Date(session.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
