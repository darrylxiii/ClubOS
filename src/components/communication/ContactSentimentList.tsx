import React from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, Minus, Mail, User, 
  MessageSquare, Calendar, ArrowRight 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useContactEmailSentiment, useCompanyContacts } from '@/hooks/useCompanyContacts';
import { formatDistanceToNow } from 'date-fns';

interface ContactSentimentListProps {
  companyId: string;
  onViewEmails?: (contactId: string) => void;
}

export function ContactSentimentList({ companyId, onViewEmails }: ContactSentimentListProps) {
  const { data: sentiments = [], isLoading } = useContactEmailSentiment(companyId);
  const { data: contacts = [] } = useCompanyContacts(companyId);

  // Merge contacts with their sentiment data
  const contactsWithSentiment = contacts.map(contact => {
    const sentiment = sentiments.find(s => s.contact_id === contact.id);
    return {
      ...contact,
      sentiment: sentiment || null,
    };
  });

  const getSentimentColor = (score: number | undefined) => {
    if (score === undefined || score === null) return 'bg-muted';
    if (score > 0.3) return 'bg-emerald-500';
    if (score > -0.3) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getTrendIcon = (trend: string | undefined) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-emerald-500" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (contactsWithSentiment.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No contacts for this company</p>
          <p className="text-sm">Add contacts to track individual sentiment</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <User className="h-4 w-4" />
          Individual Contact Sentiment
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[350px] pr-4">
          <div className="space-y-3">
            {contactsWithSentiment.map((contact, index) => (
              <motion.div
                key={contact.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      contact.sentiment 
                        ? getSentimentColor(contact.sentiment.avg_sentiment_score) 
                        : 'bg-muted'
                    }`}>
                      <span className="text-sm font-medium text-white">
                        {contact.full_name?.charAt(0) || contact.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {contact.full_name || 'Unknown'}
                        </span>
                        {contact.is_primary && (
                          <Badge variant="secondary" className="text-xs">Primary</Badge>
                        )}
                        {contact.sentiment && getTrendIcon(contact.sentiment.sentiment_trend)}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {contact.email}
                      </div>
                      {contact.role && (
                        <span className="text-xs text-muted-foreground">{contact.role}</span>
                      )}
                    </div>
                  </div>

                  {contact.sentiment ? (
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {Math.round((contact.sentiment.avg_sentiment_score + 1) * 50)}%
                        </span>
                        <Badge variant={
                          contact.sentiment.avg_sentiment_score > 0.3 ? 'default' :
                          contact.sentiment.avg_sentiment_score > -0.3 ? 'secondary' : 'destructive'
                        } className="text-xs">
                          {contact.sentiment.avg_sentiment_score > 0.3 ? 'Positive' :
                           contact.sentiment.avg_sentiment_score > -0.3 ? 'Neutral' : 'Negative'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {contact.sentiment.total_emails} emails
                        </span>
                        {contact.sentiment.last_email_at && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDistanceToNow(new Date(contact.sentiment.last_email_at), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-right text-xs text-muted-foreground">
                      <span>No emails tracked</span>
                    </div>
                  )}
                </div>

                {contact.sentiment && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Sentiment Score</span>
                      <span className="font-medium">
                        {contact.sentiment.avg_sentiment_score.toFixed(2)}
                      </span>
                    </div>
                    <Progress 
                      value={(contact.sentiment.avg_sentiment_score + 1) * 50} 
                      className="h-1.5"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex gap-2 text-xs">
                        <span className="text-muted-foreground">
                          In: {contact.sentiment.inbound_count}
                        </span>
                        <span className="text-muted-foreground">
                          Out: {contact.sentiment.outbound_count}
                        </span>
                      </div>
                      {onViewEmails && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 text-xs"
                          onClick={() => onViewEmails(contact.id)}
                        >
                          View Emails
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
