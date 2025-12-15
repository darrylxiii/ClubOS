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
    if (lead.stage === 'qualified' || (lead.deal_value || 0) > 0) return { label: 'Deal Created', color: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0' };
    if (lead.bounced_at) return { label: 'Bounced', color: 'bg-red-500/20 text-red-500' };
    if (lead.is_interested) return { label: 'Interested', color: 'bg-emerald-500/20 text-emerald-500' };
    if (lead.last_replied_at) return { label: 'Replied', color: 'bg-green-500/20 text-green-500' };
    if (lead.last_clicked_at) return { label: 'Clicked', color: 'bg-amber-500/20 text-amber-500' };
    if (lead.last_opened_at) return { label: 'Opened', color: 'bg-blue-500/20 text-blue-500' };
    return { label: 'Sent', color: 'bg-muted/20 text-muted-foreground' };
  };

  // ... (rest of component)

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
                </motion.tr >
              );
})}
          </TableBody >
        </Table >
      </div >

{
  filteredLeads.length > 50 && (
    <div className="text-center text-sm text-muted-foreground mt-4">
      Showing 50 of {filteredLeads.length} leads
    </div>
  )
}
    </Card >
  );
}
