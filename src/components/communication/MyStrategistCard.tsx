import { User, Clock, MessageSquare, TrendingUp, Mail, Phone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  strategist: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    email: string | null;
    relationship_score: number;
    response_time_hours: number;
    last_contact: string | null;
  } | null;
}

export function MyStrategistCard({ strategist }: Props) {
  if (!strategist) {
    return (
      <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
        <CardContent className="p-6 text-center">
          <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">No strategist assigned yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            A dedicated strategist will be assigned to help you soon
          </p>
        </CardContent>
      </Card>
    );
  }

  const scoreColor = 
    strategist.relationship_score >= 80 ? 'text-green-500' :
    strategist.relationship_score >= 60 ? 'text-yellow-500' : 'text-orange-500';

  const scoreLabel = 
    strategist.relationship_score >= 80 ? 'Excellent' :
    strategist.relationship_score >= 60 ? 'Good' : 'Building';

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <User className="h-5 w-5 text-primary" />
          Your Dedicated Strategist
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Strategist Profile */}
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-primary/20">
            <AvatarImage src={strategist.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-lg">
              {strategist.full_name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-foreground">{strategist.full_name}</h3>
            <p className="text-sm text-muted-foreground">Career Strategist</p>
            {strategist.last_contact && (
              <p className="text-xs text-muted-foreground mt-1">
                Last contact: {formatDistanceToNow(new Date(strategist.last_contact), { addSuffix: true })}
              </p>
            )}
          </div>
        </div>

        {/* Relationship Health */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Relationship Health</span>
            <Badge variant="outline" className={scoreColor}>
              {scoreLabel}
            </Badge>
          </div>
          <Progress value={strategist.relationship_score} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Score: {strategist.relationship_score}%</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Avg. response: {strategist.response_time_hours}h
            </span>
          </div>
        </div>

        {/* Response Time SLA */}
        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">Response Expectations</span>
          </div>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• WhatsApp: Within 4 hours (business hours)</li>
            <li>• Email: Within 24 hours</li>
            <li>• Urgent matters: Same day callback</li>
          </ul>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 gap-1">
            <MessageSquare className="h-4 w-4" />
            Message
          </Button>
          <Button variant="outline" size="sm" className="flex-1 gap-1">
            <Mail className="h-4 w-4" />
            Email
          </Button>
          <Button variant="outline" size="sm" className="gap-1">
            <Phone className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
