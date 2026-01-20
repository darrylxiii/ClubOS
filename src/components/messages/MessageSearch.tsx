import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Filter, Calendar, User, Tag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';

interface MessageSearchProps {
  onSelectMessage: (conversationId: string, messageId: string) => void;
}

export const MessageSearch = ({ onSelectMessage }: MessageSearchProps) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    sender: '',
    dateFrom: undefined as Date | undefined,
    dateTo: undefined as Date | undefined,
    priority: '',
    hasAttachments: false,
  });

  const handleSearch = async () => {
    if (!searchQuery.trim() && !filters.sender && !filters.dateFrom) return;

    setLoading(true);
    try {
      let query = supabase
        .from('messages')
        .select(`
          *,
          conversation:conversations!inner(id, title),
          sender:profiles!messages_sender_id_fkey(full_name, avatar_url)
        `)
        .or(`content.ilike.%${searchQuery}%`);

      // Apply filters
      if (filters.sender) {
        const { data: senderProfile } = await supabase
          .from('profiles')
          .select('id')
          .ilike('full_name', `%${filters.sender}%`)
          .single();
        
        if (senderProfile) {
          query = query.eq('sender_id', senderProfile.id);
        }
      }

      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom.toISOString());
      }

      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo.toISOString());
      }

      if (filters.priority) {
        query = query.eq('priority', filters.priority);
      }

      if (filters.hasAttachments) {
        const { data: attachments } = await supabase
          .from('message_attachments')
          .select('message_id');
        
        if (attachments) {
          query = query.in('id', attachments.map(a => a.message_id));
        }
      }

      // Ensure user has access to these conversations
      const { data: userConvos } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user?.id);

      if (userConvos) {
        query = query.in('conversation_id', userConvos.map(c => c.conversation_id));
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setResults(data || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      sender: '',
      dateFrom: undefined,
      dateTo: undefined,
      priority: '',
      hasAttachments: false,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-9"
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <h4 className="font-semibold">Filters</h4>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Sender</label>
                <div className="relative">
                  <User className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by sender"
                    value={filters.sender}
                    onChange={(e) => setFilters({ ...filters, sender: e.target.value })}
                    className="pl-8"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Date Range</label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full justify-start text-left font-normal">
                        <Calendar className="mr-2 h-4 w-4" />
                        {filters.dateFrom ? format(filters.dateFrom, 'PP') : 'From'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={filters.dateFrom}
                        onSelect={(date) => setFilters({ ...filters, dateFrom: date })}
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full justify-start text-left font-normal">
                        <Calendar className="mr-2 h-4 w-4" />
                        {filters.dateTo ? format(filters.dateTo, 'PP') : 'To'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={filters.dateTo}
                        onSelect={(date) => setFilters({ ...filters, dateTo: date })}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={clearFilters} variant="outline" size="sm" className="flex-1">
                  Clear
                </Button>
                <Button onClick={handleSearch} size="sm" className="flex-1">
                  Apply
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        <Button onClick={handleSearch} disabled={loading}>
          Search
        </Button>
      </div>

      <ScrollArea className="h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-muted-foreground">Searching...</p>
          </div>
        ) : results.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-muted-foreground">No results found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {results.map((result) => (
              <button
                key={result.id}
                onClick={() => onSelectMessage(result.conversation_id, result.id)}
                className="w-full p-3 text-left rounded-lg hover:bg-accent transition-colors"
              >
                <div className="flex items-start justify-between mb-1">
                  <span className="font-medium text-sm">
                    {result.conversation?.title || 'Unknown'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(result.created_at), 'MMM d, yyyy')}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {result.content}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-muted-foreground">
                    {result.sender?.full_name || 'Unknown'}
                  </span>
                  {result.is_urgent && (
                    <Badge variant="destructive" className="text-xs">Urgent</Badge>
                  )}
                  {result.priority === 'high' && (
                    <Badge variant="default" className="text-xs">High Priority</Badge>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
