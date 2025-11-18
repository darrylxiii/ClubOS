import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

const statusColors = {
  open: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  in_progress: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  waiting_customer: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  waiting_internal: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  resolved: 'bg-green-500/10 text-green-500 border-green-500/20',
  closed: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
};

const priorityColors = {
  low: 'text-gray-500',
  medium: 'text-blue-500',
  high: 'text-orange-500',
  urgent: 'text-red-500',
  critical: 'text-red-600',
};

export default function SupportTicketList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['support-tickets', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const filteredTickets = tickets?.filter(ticket =>
    ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.ticket_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container max-w-6xl py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Support Tickets</h1>
          <p className="text-muted-foreground">Track and manage your support requests</p>
        </div>
        <Button onClick={() => navigate('/support/tickets/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Ticket
        </Button>
      </div>

      <Card className="p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tickets..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="waiting_customer">Waiting for You</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {isLoading ? (
        <Card className="p-8 text-center text-muted-foreground">
          Loading tickets...
        </Card>
      ) : filteredTickets && filteredTickets.length > 0 ? (
        <div className="space-y-3">
          {filteredTickets.map((ticket) => (
            <Card
              key={ticket.id}
              className="p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/support/tickets/${ticket.id}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-sm text-muted-foreground">
                      {ticket.ticket_number}
                    </span>
                    <Badge variant="outline" className={statusColors[ticket.status as keyof typeof statusColors]}>
                      {ticket.status.replace('_', ' ')}
                    </Badge>
                    <span className={`text-xs font-medium ${priorityColors[ticket.priority as keyof typeof priorityColors]}`}>
                      {ticket.priority.toUpperCase()}
                    </span>
                  </div>
                  <h3 className="font-semibold text-lg mb-1">{ticket.subject}</h3>
                  <p className="text-sm text-muted-foreground">
                    Category: {ticket.category.replace('_', ' ')}
                  </p>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <p>{formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</p>
                  {ticket.sla_breached && (
                    <Badge variant="destructive" className="mt-2">SLA Breached</Badge>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-4">
            {searchQuery || statusFilter !== 'all' 
              ? 'No tickets match your filters'
              : 'No support tickets yet'}
          </p>
          <Button onClick={() => navigate('/support/tickets/new')}>
            Create Your First Ticket
          </Button>
        </Card>
      )}
    </div>
  );
}
