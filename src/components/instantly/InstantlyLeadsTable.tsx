import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
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
    if (lead.stage === 'qualified' || (lead.deal_value || 0) > 0) return { label: 'Deal Created', color: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0' };
    if (lead.bounced_at) return { label: 'Bounced', color: 'bg-red-500/20 text-red-500' };
    if (lead.is_interested) return { label: 'Interested', color: 'bg-emerald-500/20 text-emerald-500' };
    if (lead.last_replied_at) return { label: 'Replied', color: 'bg-green-500/20 text-green-500' };
    if (lead.last_clicked_at) return { label: 'Clicked', color: 'bg-amber-500/20 text-amber-500' };
    if (lead.last_opened_at) return { label: 'Opened', color: 'bg-blue-500/20 text-blue-500' };
    return { label: 'Sent', color: 'bg-muted/20 text-muted-foreground' };
  };

  const getEngagementIcons = (lead: InstantlyLead) => {
    const icons = [];
    if (lead.last_opened_at) icons.push(<Eye key="opened" className="h-4 w-4 text-blue-500" />);
    if (lead.last_clicked_at) icons.push(<MousePointer key="clicked" className="h-4 w-4 text-amber-500" />);
    if (lead.last_replied_at) icons.push(<MessageSquare key="replied" className="h-4 w-4 text-green-500" />);
    if (lead.is_interested) icons.push(<Star key="interested" className="h-4 w-4 text-emerald-500" />);
    if (lead.bounced_at) icons.push(<AlertTriangle key="bounced" className="h-4 w-4 text-red-500" />);
    return icons;
  };

  const displayLeads = filteredLeads.slice(0, 50);

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
      {/* Filters */}
      <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
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
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contact</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Engagement</TableHead>
              <TableHead>Last Activity</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayLeads.map((lead, index) => {
              const status = getLeadStatus(lead);
              const engagementIcons = getEngagementIcons(lead);

              return (
                <motion.tr
                  key={lead.id || lead.email}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="group hover:bg-muted/30"
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Mail className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {lead.first_name} {lead.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">{lead.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{lead.company_name || '-'}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant="outline" className={status.color}>
                        {status.label}
                      </Badge>
                      {(lead.deal_value || 0) > 0 && (
                        <span className="text-xs font-medium text-emerald-500 text-center">
                          {(lead.deal_value || 0).toLocaleString('en-US', { style: 'currency', currency: lead.currency || 'USD', maximumFractionDigits: 0 })}
                        </span>
                      )}
                    </div>
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
        <div className="text-center text-sm text-muted-foreground p-4 border-t border-border/50">
          Showing 50 of {filteredLeads.length} leads
        </div>
      )}
    </Card>
  );
}
