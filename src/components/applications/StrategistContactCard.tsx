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
      <div className="flex items-center gap-4 p-6 rounded-2xl bg-card border border-border/50 h-full">
        <Avatar className="w-14 h-14">
          <AvatarFallback className="bg-muted text-muted-foreground">?</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
            Your Talent Strategist
          </div>
          <div className="text-sm text-muted-foreground">Being assigned...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-2xl bg-card border border-border/50 h-full flex flex-col">
      <div className="flex items-center gap-4 mb-4">
        <div className="relative">
          <Avatar className="w-14 h-14 ring-2 ring-border">
            <AvatarImage src={strategist.avatar_url || ''} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
              {strategist.full_name?.[0] || 'T'}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-1 -right-1">
            <OnlineStatusIndicator userId={strategist.user_id} />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
            Your Talent Strategist
          </div>
          <div className="text-base font-bold truncate">{strategist.full_name}</div>
        </div>
      </div>
      
      {lastContact && (
        <div className="mb-4 text-sm text-muted-foreground">
          Last contact: <span className="font-medium">{lastContact}</span>
        </div>
      )}
      
      <Button 
        size="lg" 
        className="w-full mt-auto"
        onClick={(e) => {
          e.stopPropagation();
          navigate('/messages');
        }}
      >
        <MessageSquare className="w-4 h-4 mr-2" />
        Message
      </Button>
    </div>
  );
}
