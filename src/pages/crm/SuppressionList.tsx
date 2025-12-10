import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { RoleGate } from '@/components/RoleGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { 
  ShieldX, 
  Plus, 
  Search, 
  Trash2, 
  Mail,
  Globe,
  User,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CRMEmptyState } from '@/components/crm/CRMEmptyState';

interface SuppressionEntry {
  id: string;
  email?: string;
  domain?: string;
  type?: string;
  reason?: string;
  added_by: string;
  added_by_name?: string;
  created_at: string;
}

export default function SuppressionList() {
  const [entries, setEntries] = useState<SuppressionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newEntry, setNewEntry] = useState({
    type: 'email' as 'email' | 'domain',
    value: '',
    reason: '',
  });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('crm_suppression_list')
        .select(`
          *,
          adder:profiles!crm_suppression_list_added_by_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setEntries((data || []).map(item => ({
        id: item.id,
        email: item.email || undefined,
        domain: item.domain || undefined,
        type: item.domain ? 'domain' : 'email',
        reason: item.reason || undefined,
        added_by: item.added_by,
        added_by_name: (item.adder as any)?.full_name,
        created_at: item.created_at,
      })));
    } catch (error) {
      console.error('Error fetching suppression list:', error);
      toast.error('Failed to load suppression list');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newEntry.value.trim()) {
      toast.error('Please enter an email or domain');
      return;
    }

    setAdding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const insertData: any = {
        type: newEntry.type,
        reason: newEntry.reason || 'Manual suppression',
        added_by: user.id,
      };

      if (newEntry.type === 'email') {
        insertData.email = newEntry.value.toLowerCase();
      } else {
        insertData.domain = newEntry.value.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '');
      }

      const { error } = await supabase
        .from('crm_suppression_list')
        .insert(insertData);

      if (error) throw error;

      toast.success('Added to suppression list');
      setShowAddDialog(false);
      setNewEntry({ type: 'email', value: '', reason: '' });
      fetchEntries();
    } catch (error: any) {
      console.error('Error adding suppression:', error);
      toast.error(error.message || 'Failed to add suppression');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('crm_suppression_list')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setEntries(entries.filter(e => e.id !== id));
      toast.success('Removed from suppression list');
    } catch (error) {
      console.error('Error deleting suppression:', error);
      toast.error('Failed to remove suppression');
    }
  };

  const filteredEntries = entries.filter(entry => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      entry.email?.toLowerCase().includes(searchLower) ||
      entry.domain?.toLowerCase().includes(searchLower) ||
      entry.reason?.toLowerCase().includes(searchLower)
    );
  });

  const getTypeIcon = (type?: string) => {
    switch (type) {
      case 'domain': return <Globe className="w-4 h-4" />;
      case 'gdpr_request': return <User className="w-4 h-4" />;
      default: return <Mail className="w-4 h-4" />;
    }
  };

  const getTypeBadge = (type?: string) => {
    switch (type) {
      case 'domain':
        return <Badge variant="outline" className="bg-purple-500/20 text-purple-400">Domain</Badge>;
      case 'gdpr_request':
        return <Badge variant="outline" className="bg-red-500/20 text-red-400">GDPR</Badge>;
      default:
        return <Badge variant="outline" className="bg-blue-500/20 text-blue-400">Email</Badge>;
    }
  };

  return (
    <AppLayout>
      <RoleGate allowedRoles={['admin', 'strategist']}>
        <div className="container mx-auto px-4 py-6 max-w-6xl space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
          >
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <ShieldX className="w-6 h-6" />
                Suppression List
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage blocked emails and domains
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-48 bg-muted/20"
                />
              </div>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Entry
              </Button>
            </div>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{entries.filter(e => e.type === 'email').length}</p>
                <p className="text-xs text-muted-foreground">Blocked Emails</p>
              </CardContent>
            </Card>
          <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{entries.filter(e => e.type === 'domain').length}</p>
                <p className="text-xs text-muted-foreground">Blocked Domains</p>
              </CardContent>
            </Card>
          <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{entries.filter(e => e.type === 'gdpr_request').length}</p>
                <p className="text-xs text-muted-foreground">GDPR Requests</p>
              </CardContent>
            </Card>
          </div>

          {/* List */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredEntries.length === 0 ? (
            <CRMEmptyState
              type="no-prospects"
            />
          ) : (
            <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
              <CardContent className="p-0">
                <div className="divide-y divide-border/30">
                  {filteredEntries.map((entry, index) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className="p-4 flex items-center justify-between hover:bg-muted/10 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-muted/30">
                          {getTypeIcon(entry.type)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {entry.email || entry.domain}
                            </span>
                            {getTypeBadge(entry.type)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {entry.reason}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Added by {entry.added_by_name || 'Unknown'} •{' '}
                            {format(new Date(entry.created_at), 'PP')}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(entry.id)}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Add Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add to Suppression List</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={newEntry.type}
                  onValueChange={(v) => setNewEntry({ ...newEntry, type: v as 'email' | 'domain' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email Address</SelectItem>
                    <SelectItem value="domain">Domain</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{newEntry.type === 'email' ? 'Email Address' : 'Domain'}</Label>
                <Input
                  placeholder={newEntry.type === 'email' ? 'user@example.com' : 'example.com'}
                  value={newEntry.value}
                  onChange={(e) => setNewEntry({ ...newEntry, value: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <Textarea
                  placeholder="Why is this being suppressed?"
                  value={newEntry.reason}
                  onChange={(e) => setNewEntry({ ...newEntry, reason: e.target.value })}
                  className="min-h-[80px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAdd} disabled={adding}>
                {adding ? 'Adding...' : 'Add to List'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </RoleGate>
    </AppLayout>
  );
}
