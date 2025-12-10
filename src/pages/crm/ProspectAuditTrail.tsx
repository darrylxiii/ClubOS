import { useState } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProspectActivityLog } from '@/components/crm/ProspectActivityLog';
import { LeadScoreHistory } from '@/components/crm/LeadScoreHistory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, Search, Users, Clock, Edit } from 'lucide-react';
import { format } from 'date-fns';

interface AuditEntry {
  id: string;
  prospectId: string;
  prospectName: string;
  action: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
  performedBy: string;
  timestamp: string;
}

export default function ProspectAuditTrail() {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [selectedProspect, setSelectedProspect] = useState<string | null>(null);

  const [auditEntries] = useState<AuditEntry[]>([
    {
      id: '1',
      prospectId: 'p1',
      prospectName: 'John Smith',
      action: 'stage_changed',
      field: 'stage',
      oldValue: 'Contacted',
      newValue: 'Interested',
      performedBy: 'Alex Thompson',
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
    {
      id: '2',
      prospectId: 'p2',
      prospectName: 'Sarah Johnson',
      action: 'field_updated',
      field: 'company_size',
      oldValue: '100-500',
      newValue: '500-1000',
      performedBy: 'Sarah Wilson',
      timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    },
    {
      id: '3',
      prospectId: 'p1',
      prospectName: 'John Smith',
      action: 'email_sent',
      performedBy: 'System',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    },
    {
      id: '4',
      prospectId: 'p3',
      prospectName: 'Michael Chen',
      action: 'owner_changed',
      field: 'owner',
      oldValue: 'Sarah Wilson',
      newValue: 'Alex Thompson',
      performedBy: 'Admin',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    },
    {
      id: '5',
      prospectId: 'p2',
      prospectName: 'Sarah Johnson',
      action: 'note_added',
      performedBy: 'Alex Thompson',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    },
  ]);

  const filteredEntries = auditEntries.filter(entry => {
    if (actionFilter !== 'all' && entry.action !== actionFilter) return false;
    if (searchQuery && !entry.prospectName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      stage_changed: 'bg-orange-500/20 text-orange-500 border-orange-500/30',
      field_updated: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
      email_sent: 'bg-green-500/20 text-green-500 border-green-500/30',
      owner_changed: 'bg-purple-500/20 text-purple-500 border-purple-500/30',
      note_added: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
    };
    return colors[action] || 'bg-muted text-muted-foreground';
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Activity className="h-8 w-8 text-primary" />
          Prospect Audit Trail
        </h1>
        <p className="text-muted-foreground mt-2">
          Complete history of all changes to prospect records
        </p>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Audit Log List */}
        <div className="lg:col-span-2">
          <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by prospect name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="stage_changed">Stage Changed</SelectItem>
                    <SelectItem value="field_updated">Field Updated</SelectItem>
                    <SelectItem value="email_sent">Email Sent</SelectItem>
                    <SelectItem value="owner_changed">Owner Changed</SelectItem>
                    <SelectItem value="note_added">Note Added</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {filteredEntries.map((entry, index) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedProspect === entry.prospectId 
                          ? 'bg-primary/10 border-primary/30' 
                          : 'bg-background/50 border-border/30 hover:border-border/50'
                      }`}
                      onClick={() => setSelectedProspect(entry.prospectId)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{entry.prospectName}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className={getActionBadge(entry.action)}>
                                {entry.action.replace(/_/g, ' ')}
                              </Badge>
                              {entry.field && (
                                <span className="text-xs text-muted-foreground">
                                  {entry.oldValue} → {entry.newValue}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(entry.timestamp), 'MMM d, h:mm a')}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            by {entry.performedBy}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Prospect Detail Panel */}
        <div className="space-y-6">
          {selectedProspect ? (
            <>
              <ProspectActivityLog 
                prospectId={selectedProspect} 
                prospectName={auditEntries.find(e => e.prospectId === selectedProspect)?.prospectName}
              />
              <LeadScoreHistory 
                prospectId={selectedProspect}
                prospectName={auditEntries.find(e => e.prospectId === selectedProspect)?.prospectName}
              />
            </>
          ) : (
            <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
              <CardContent className="py-12 text-center">
                <Edit className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Select a prospect to view detailed activity
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
