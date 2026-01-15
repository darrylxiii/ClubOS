import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Check, X, Mail, Phone, RefreshCw, Search, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface VerificationAttempt {
  id: string;
  user_id: string;
  verification_type: string;
  action: string;
  success: boolean;
  email?: string | null;
  phone?: string | null;
  error_message?: string | null;
  created_at: string;
  ip_address?: unknown;
  user_agent?: string | null;
  profiles?: {
    full_name: string | null;
    email: string | null;
  } | null;
}

export const VerificationManagement = () => {
  const [attempts, setAttempts] = useState<VerificationAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'email' | 'phone'>('all');
  const [filterSuccess, setFilterSuccess] = useState<'all' | 'success' | 'failed'>('all');

  useEffect(() => {
    fetchAttempts();
  }, []);

  const fetchAttempts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('verification_attempts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      // Fetch profile info for each user
      if (data) {
        const userIds = [...new Set(data.map(a => a.user_id).filter((id): id is string => id !== null))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
        const enrichedData = data.map(attempt => ({
          ...attempt,
          profiles: attempt.user_id ? profilesMap.get(attempt.user_id) : undefined
        }));
        
        setAttempts(enrichedData as any);
      }
    } catch (error: any) {
      console.error('Error fetching attempts:', error);
      toast.error('Failed to load verification attempts');
    } finally {
      setLoading(false);
    }
  };

  const manualVerifyEmail = async (userId: string, email: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ email_verified: true, email })
        .eq('id', userId);

      if (error) throw error;

      toast.success('Email manually verified');
      fetchAttempts();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Failed to verify email');
    }
  };

  const manualVerifyPhone = async (userId: string, phone: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ phone_verified: true, phone })
        .eq('id', userId);

      if (error) throw error;

      toast.success('Phone manually verified');
      fetchAttempts();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Failed to verify phone');
    }
  };

  const filteredAttempts = attempts.filter(attempt => {
    const matchesSearch = 
      attempt.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      attempt.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      attempt.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      attempt.phone?.includes(searchQuery);

    const matchesType = filterType === 'all' || attempt.verification_type === filterType;
    const matchesSuccess = 
      filterSuccess === 'all' || 
      (filterSuccess === 'success' && attempt.success) ||
      (filterSuccess === 'failed' && !attempt.success);

    return matchesSearch && matchesType && matchesSuccess;
  });

  const stats = {
    total: attempts.length,
    successful: attempts.filter(a => a.success).length,
    failed: attempts.filter(a => !a.success).length,
    email: attempts.filter(a => a.verification_type === 'email').length,
    phone: attempts.filter(a => a.verification_type === 'phone').length,
  };

  return (
    <div className="space-y-6">
      <Card className="glass-card border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            Verification Management
          </CardTitle>
          <CardDescription>
            Monitor verification attempts and manually verify users
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-5 gap-4">
            <Card className="glass-subtle">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-foreground">{stats.total}</div>
                <div className="text-xs text-muted-foreground">Total Attempts</div>
              </CardContent>
            </Card>
            <Card className="glass-subtle border-green-500/20">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-500">{stats.successful}</div>
                <div className="text-xs text-muted-foreground">Successful</div>
              </CardContent>
            </Card>
            <Card className="glass-subtle border-red-500/20">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-red-500">{stats.failed}</div>
                <div className="text-xs text-muted-foreground">Failed</div>
              </CardContent>
            </Card>
            <Card className="glass-subtle">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-primary">{stats.email}</div>
                <div className="text-xs text-muted-foreground">Email</div>
              </CardContent>
            </Card>
            <Card className="glass-subtle">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-primary">{stats.phone}</div>
                <div className="text-xs text-muted-foreground">Phone</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 glass-subtle border-primary/20"
                />
              </div>
            </div>
            <Tabs value={filterType} onValueChange={(v) => setFilterType(v as any)}>
              <TabsList className="glass-subtle">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="email">Email</TabsTrigger>
                <TabsTrigger value="phone">Phone</TabsTrigger>
              </TabsList>
            </Tabs>
            <Tabs value={filterSuccess} onValueChange={(v) => setFilterSuccess(v as any)}>
              <TabsList className="glass-subtle">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="success">Success</TabsTrigger>
                <TabsTrigger value="failed">Failed</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button onClick={fetchAttempts} variant="outline" className="glass-subtle border-primary/20">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Attempts Table */}
          <div className="glass-subtle border border-primary/20 rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-primary/20">
                  <TableHead>User</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="animate-spin mx-auto h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full" />
                    </TableCell>
                  </TableRow>
                ) : filteredAttempts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No verification attempts found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAttempts.map((attempt) => (
                    <TableRow key={attempt.id} className="border-primary/20">
                      <TableCell>
                        <div>
                          <div className="font-medium">{attempt.profiles?.full_name || 'Unknown'}</div>
                          <div className="text-xs text-muted-foreground">{attempt.profiles?.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="glass-subtle">
                          {attempt.verification_type === 'email' ? (
                            <><Mail className="h-3 w-3 mr-1" /> Email</>
                          ) : (
                            <><Phone className="h-3 w-3 mr-1" /> Phone</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{attempt.action}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {attempt.email || attempt.phone}
                      </TableCell>
                      <TableCell>
                        {attempt.success ? (
                          <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                            <Check className="h-3 w-3 mr-1" /> Success
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="bg-red-500/10 text-red-500 border-red-500/20">
                            <X className="h-3 w-3 mr-1" /> Failed
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(attempt.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        {!attempt.success && attempt.action === 'verify' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (attempt.verification_type === 'email' && attempt.email) {
                                manualVerifyEmail(attempt.user_id, attempt.email);
                              } else if (attempt.verification_type === 'phone' && attempt.phone) {
                                manualVerifyPhone(attempt.user_id, attempt.phone);
                              }
                            }}
                            className="glass-subtle border-primary/20 hover:bg-primary/10"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Verify
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
