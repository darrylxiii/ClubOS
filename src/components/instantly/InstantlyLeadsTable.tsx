import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Eye, 
  MousePointer, 
  MessageSquare,
  AlertTriangle,
  Star,
  ArrowUpRight,
  Mail
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { InstantlyLead } from '@/hooks/useInstantlyData';
import { formatDistanceToNow } from 'date-fns';

interface InstantlyLeadsTableProps {
  leads: InstantlyLead[];
  onPromoteToCRM: (lead: InstantlyLead) => void;
}

export function InstantlyLeadsTable({ leads, onPromoteToCRM }: InstantlyLeadsTableProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchesSearch = 
        lead.email?.toLowerCase().includes(search.toLowerCase()) ||
        lead.first_name?.toLowerCase().includes(search.toLowerCase()) ||
        lead.last_name?.toLowerCase().includes(search.toLowerCase()) ||
        lead.company_name?.toLowerCase().includes(search.toLowerCase());

      if (statusFilter === 'all') return matchesSearch;
      if (statusFilter === 'opened') return matchesSearch && lead.last_opened_at;
      if (statusFilter === 'clicked') return matchesSearch && lead.last_clicked_at;
      if (statusFilter === 'replied') return matchesSearch && lead.last_replied_at;
      if (statusFilter === 'interested') return matchesSearch && lead.is_interested;
      if (statusFilter === 'bounced') return matchesSearch && lead.bounced_at;
      
      return matchesSearch;
    });
  }, [leads, search, statusFilter]);

  const getLeadStatus = (lead: InstantlyLead) => {
    if (lead.bounced_at) return { label: 'Bounced', color: 'bg-red-500/20 text-red-500' };
    if (lead.is_interested) return { label: 'Interested', color: 'bg-emerald-500/20 text-emerald-500' };
    if (lead.last_replied_at) return { label: 'Replied', color: 'bg-green-500/20 text-green-500' };
    if (lead.last_clicked_at) return { label: 'Clicked', color: 'bg-amber-500/20 text-amber-500' };
    if (lead.last_opened_at) return { label: 'Opened', color: 'bg-blue-500/20 text-blue-500' };
    return { label: 'Sent', color: 'bg-muted/20 text-muted-foreground' };
  };

  const getEngagementIcons = (lead: InstantlyLead) => {
    const icons = [];
    if (lead.last_opened_at) icons.push(<Eye key="eye" className="h-3 w-3 text-blue-500" />);
    if (lead.last_clicked_at) icons.push(<MousePointer key="click" className="h-3 w-3 text-amber-500" />);
    if (lead.last_replied_at) icons.push(<MessageSquare key="reply" className="h-3 w-3 text-green-500" />);
    if (lead.is_interested) icons.push(<Star key="star" className="h-3 w-3 text-emerald-500" />);
    if (lead.bounced_at) icons.push(<AlertTriangle key="bounce" className="h-3 w-3 text-red-500" />);
    return icons;
  };

  return (
    <Card className="p-4 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
      {/* Filters */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email, name, or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Leads</SelectItem>
            <SelectItem value="opened">Opened</SelectItem>
            <SelectItem value="clicked">Clicked</SelectItem>
            <SelectItem value="replied">Replied</SelectItem>
            <SelectItem value="interested">Interested</SelectItem>
            <SelectItem value="bounced">Bounced</SelectItem>
          </SelectContent>
        </Select>

        <div className="text-sm text-muted-foreground">
          {filteredLeads.length} leads
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border/30 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/20">
              <TableHead>Lead</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Engagement</TableHead>
              <TableHead>Last Activity</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLeads.slice(0, 50).map((lead, index) => {
              const status = getLeadStatus(lead);
              const engagementIcons = getEngagementIcons(lead);
              
              return (
                <motion.tr
                  key={lead.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.02 }}
                  className="hover:bg-muted/10"
                >
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {lead.first_name || lead.last_name 
                          ? `${lead.first_name || ''} ${lead.last_name || ''}`.trim()
                          : 'Unknown'}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {lead.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{lead.company_name || '-'}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={status.color}>
                      {status.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {engagementIcons.length > 0 ? engagementIcons : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {lead.last_replied_at 
                        ? formatDistanceToNow(new Date(lead.last_replied_at), { addSuffix: true })
                        : lead.last_clicked_at
                        ? formatDistanceToNow(new Date(lead.last_clicked_at), { addSuffix: true })
                        : lead.last_opened_at
                        ? formatDistanceToNow(new Date(lead.last_opened_at), { addSuffix: true })
                        : '-'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {(lead.is_interested || lead.last_replied_at) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onPromoteToCRM(lead)}
                        className="text-primary"
                      >
                        <ArrowUpRight className="h-4 w-4 mr-1" />
                        To CRM
                      </Button>
                    )}
                  </TableCell>
                </motion.tr>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {filteredLeads.length > 50 && (
        <div className="text-center text-sm text-muted-foreground mt-4">
          Showing 50 of {filteredLeads.length} leads
        </div>
      )}
    </Card>
  );
}
