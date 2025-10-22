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
      <div className="p-4 rounded-xl bg-card/30 backdrop-blur-[var(--blur-glass)] border border-border/20 h-full">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Talent Strategist</div>
        <div className="flex items-center gap-3">
          <Avatar className="w-12 h-12">
            <AvatarFallback className="bg-muted">?</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="text-sm text-muted-foreground">Being assigned...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-card/30 backdrop-blur-[var(--blur-glass)] border border-border/20 h-full flex flex-col">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Talent Strategist</div>
      
      <div className="flex items-center gap-3 mb-3">
        <div className="relative">
          <Avatar className="w-12 h-12 border border-border/30">
            <AvatarImage src={strategist.avatar_url || ''} />
            <AvatarFallback className="bg-muted">
              {strategist.full_name?.[0] || 'T'}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-0.5 -right-0.5">
            <OnlineStatusIndicator userId={strategist.user_id} />
          </div>
        </div>
        <div className="flex-1">
          <div className="text-base font-medium">{strategist.full_name}</div>
          {lastContact && (
            <div className="text-xs text-muted-foreground mt-0.5">
              Last contact: {lastContact}
            </div>
          )}
        </div>
      </div>
      
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
