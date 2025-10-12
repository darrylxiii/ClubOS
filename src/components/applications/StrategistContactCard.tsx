import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageSquare, Calendar, Phone } from "lucide-react";
import { OnlineStatusIndicator } from "@/components/messages/OnlineStatusIndicator";
import { useNavigate } from "react-router-dom";

interface StrategistContactCardProps {
  strategist?: {
    id: string;
    full_name: string;
    avatar_url: string;
    user_id: string;
  };
}

export function StrategistContactCard({ strategist }: StrategistContactCardProps) {
  const navigate = useNavigate();

  if (!strategist) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30 border border-border/50">
        <Avatar className="w-12 h-12">
          <AvatarFallback className="bg-muted">?</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Your Talent Strategist</div>
          <div className="text-sm text-muted-foreground">Being assigned...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
      <div className="flex items-center gap-3 mb-3">
        <div className="relative">
          <Avatar className="w-14 h-14 ring-2 ring-primary/30">
            <AvatarImage src={strategist.avatar_url || ''} />
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
              {strategist.full_name?.[0] || 'T'}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-1 -right-1">
            <OnlineStatusIndicator userId={strategist.user_id} />
          </div>
        </div>
        <div className="flex-1">
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Your Talent Strategist</div>
          <div className="text-base font-bold">{strategist.full_name}</div>
        </div>
      </div>
      
      <div className="flex gap-2">
        <Button 
          size="sm" 
          className="flex-1"
          onClick={(e) => {
            e.stopPropagation();
            navigate('/messages');
          }}
        >
          <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
          Message
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          className="flex-1"
          onClick={(e) => {
            e.stopPropagation();
            // Navigate to scheduling
          }}
        >
          <Calendar className="w-3.5 h-3.5 mr-1.5" />
          Schedule
        </Button>
      </div>
    </div>
  );
}
