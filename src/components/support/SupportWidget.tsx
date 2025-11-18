import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Headphones, Search, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const SupportWidget = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false);

  const { data: openTickets } = useQuery({
    queryKey: ['my-open-tickets'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data } = await supabase
        .from('support_tickets')
        .select('id, ticket_number, subject, status, created_at')
        .eq('user_id', user.id)
        .in('status', ['open', 'in_progress', 'waiting_customer'])
        .order('created_at', { ascending: false })
        .limit(3);

      return data || [];
    },
    enabled: open,
  });

  const { data: kbResults } = useQuery({
    queryKey: ['kb-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];

      const { data, error } = await supabase.functions.invoke('kb-search', {
        body: { query: searchQuery },
      });

      if (error) throw error;
      return data.results || [];
    },
    enabled: searchQuery.length >= 2,
  });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="icon"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-40 bg-primary hover:bg-primary/90"
        >
          <Headphones className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Support & Help</SheetTitle>
          <SheetDescription>
            Search our knowledge base or contact support
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Quick Search */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Quick Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search for help..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {kbResults && kbResults.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {kbResults.map((article: any) => (
                  <button
                    key={article.id}
                    onClick={() => {
                      navigate(`/help/${article.slug}`);
                      setOpen(false);
                    }}
                    className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    <p className="font-medium text-sm">{article.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {article.excerpt}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Contact Support */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Need More Help?</label>
            <Button
              onClick={() => {
                navigate('/support/tickets/new');
                setOpen(false);
              }}
              className="w-full"
            >
              Create Support Ticket
            </Button>
          </div>

          {/* Your Open Tickets */}
          {openTickets && openTickets.length > 0 && (
            <div className="space-y-3">
              <label className="text-sm font-medium">Your Open Tickets</label>
              <div className="space-y-2">
                {openTickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    onClick={() => {
                      navigate(`/support/tickets/${ticket.id}`);
                      setOpen(false);
                    }}
                    className="w-full text-left p-3 rounded-lg border bg-card hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-mono text-xs text-muted-foreground">
                        {ticket.ticket_number}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        ticket.status === 'open' ? 'bg-blue-500/10 text-blue-500' :
                        ticket.status === 'in_progress' ? 'bg-yellow-500/10 text-yellow-500' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {ticket.status}
                      </span>
                    </div>
                    <p className="font-medium text-sm line-clamp-1">{ticket.subject}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Knowledge Base Link */}
          <div className="pt-4 border-t">
            <Button
              variant="ghost"
              className="w-full justify-between"
              onClick={() => {
                navigate('/help');
                setOpen(false);
              }}
            >
              Browse Knowledge Base
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
