import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Filter, Phone, Mail, MessageSquare, Video, Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import type { CompanyInteraction } from '@/types/interaction';

export default function InteractionsFeed() {
  const navigate = useNavigate();
  const [interactions, setInteractions] = useState<CompanyInteraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sentimentFilter, setSentimentFilter] = useState('all');

  useEffect(() => {
    loadInteractions();
  }, []);

  const loadInteractions = async () => {
    setLoading(true);
    try {
      let query = (supabase as any)
        .from('company_interactions')
        .select(`
          *,
          companies (
            id,
            name
          )
        `)
        .order('interaction_date', { ascending: false })
        .limit(100);

      const { data, error } = await query;
      
      if (error) throw error;
      setInteractions(data || []);
    } catch (error) {
      console.error('Error loading interactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredInteractions = interactions.filter(interaction => {
    const matchesSearch = searchTerm === '' || 
      interaction.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      interaction.summary?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || interaction.interaction_type === typeFilter;
    
    const matchesSentiment = sentimentFilter === 'all' ||
      (sentimentFilter === 'positive' && (interaction.sentiment_score || 0) > 0.3) ||
      (sentimentFilter === 'neutral' && Math.abs(interaction.sentiment_score || 0) <= 0.3) ||
      (sentimentFilter === 'negative' && (interaction.sentiment_score || 0) < -0.3);

    return matchesSearch && matchesType && matchesSentiment;
  });

  const getInteractionIcon = (type: string) => {
    switch (type) {
      case 'phone_call': return <Phone className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'whatsapp': return <MessageSquare className="h-4 w-4" />;
      case 'zoom_meeting': return <Video className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getSentimentBadge = (score: number | null) => {
    if (!score) return null;
    
    if (score > 0.3) {
      return (
        <Badge variant="outline" className="text-green-600 border-green-600">
          <TrendingUp className="h-3 w-3 mr-1" />
          Positive
        </Badge>
      );
    } else if (score < -0.3) {
      return (
        <Badge variant="outline" className="text-red-600 border-red-600">
          <TrendingDown className="h-3 w-3 mr-1" />
          Negative
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Neutral
      </Badge>
    );
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Interaction Feed</h1>
          <p className="text-muted-foreground">All company interactions across the platform</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/interactions/import/whatsapp')} variant="outline">
            <MessageSquare className="mr-2 h-4 w-4" />
            Import WhatsApp
          </Button>
          <Button onClick={() => navigate('/interactions/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Log Interaction
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search interactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="phone_call">Phone Calls</SelectItem>
                <SelectItem value="email">Emails</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="zoom_meeting">Zoom Meetings</SelectItem>
                <SelectItem value="in_person">In Person</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sentiments</SelectItem>
                <SelectItem value="positive">Positive</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
                <SelectItem value="negative">Negative</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Interactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Interactions</CardTitle>
          <CardDescription>
            Showing {filteredInteractions.length} of {interactions.length} interactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Sentiment</TableHead>
                <TableHead>Urgency</TableHead>
                <TableHead>Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInteractions.map((interaction: any) => (
                <TableRow 
                  key={interaction.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/companies/${interaction.company_id}/intelligence`)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {new Date(interaction.interaction_date).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link 
                      to={`/companies/${interaction.company_id}/intelligence`}
                      className="hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {interaction.companies?.name || 'Unknown'}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getInteractionIcon(interaction.interaction_type)}
                      <span className="capitalize">{interaction.interaction_type.replace('_', ' ')}</span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-md truncate">
                    {interaction.subject || interaction.summary || 'No subject'}
                  </TableCell>
                  <TableCell>
                    {getSentimentBadge(interaction.sentiment_score)}
                  </TableCell>
                  <TableCell>
                    {interaction.urgency_score !== null && interaction.urgency_score !== undefined ? (
                      <Badge 
                        variant={interaction.urgency_score >= 7 ? 'destructive' : 'outline'}
                      >
                        {interaction.urgency_score}/10
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {interaction.duration_minutes ? (
                      `${interaction.duration_minutes}m`
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredInteractions.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              {loading ? 'Loading interactions...' : 'No interactions found'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
