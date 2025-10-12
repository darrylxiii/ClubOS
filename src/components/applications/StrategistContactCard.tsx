import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { OnlineStatusIndicator } from "@/components/messages/OnlineStatusIndicator";
import { useNavigate } from "react-router-dom";

interface StrategistContactCardProps {
  strategist?: {
    id: string;
    full_name: string;
    avatar_url: string;
    user_id: string;
  };
  lastContact?: string;
}

export function StrategistContactCard({ strategist, lastContact }: StrategistContactCardProps) {
  const navigate = useNavigate();

  if (!strategist) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30 border border-border/50 h-full">
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
    <div className="p-4 rounded-lg bg-muted/50 border border-border h-full flex flex-col">
      <div className="flex items-center gap-3 mb-3">
        <div className="relative">
          <Avatar className="w-12 h-12 ring-2 ring-primary/20">
            <AvatarImage src={strategist.avatar_url || ''} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {strategist.full_name?.[0] || 'T'}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-0.5 -right-0.5">
            <OnlineStatusIndicator userId={strategist.user_id} />
          </div>
        </div>
        <div className="flex-1">
          <div className="text-xs text-muted-foreground font-medium">Your Talent Strategist</div>
          <div className="text-sm font-semibold">{strategist.full_name}</div>
        </div>
      </div>
      
      {lastContact && (
        <div className="mb-3 text-xs text-muted-foreground">
          Last contact: {lastContact}
        </div>
      )}
      
      <Button 
        size="sm" 
        className="w-full mt-auto"
        onClick={(e) => {
          e.stopPropagation();
          navigate('/messages');
        }}
      >
        <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
        Message
      </Button>
    </div>
  );
}
