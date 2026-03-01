import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

interface Strategist {
  id: string;
  full_name: string;
  avatar_url: string | null;
  current_title: string | null;
}

export function CompactStrategist() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [strategist, setStrategist] = useState<Strategist | null>(null);

  useEffect(() => {
    if (!user) return;

    (async () => {
      const { data: cp } = await supabase
        .from('candidate_profiles')
        .select('assigned_strategist_id')
        .eq('id', user.id)
        .single();

      if (!cp?.assigned_strategist_id) return;

      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, current_title')
        .eq('id', cp.assigned_strategist_id)
        .single();

      if (data) setStrategist(data);
    })();
  }, [user]);

  if (!strategist) return null;

  const initials = strategist.full_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="glass-subtle rounded-2xl px-5 py-3.5 flex items-center gap-3">
      <Avatar className="h-9 w-9 border border-border/30">
        <AvatarImage src={strategist.avatar_url || undefined} />
        <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{strategist.full_name}</p>
        <p className="text-xs text-muted-foreground truncate">
          {strategist.current_title || "Talent Strategist"}
        </p>
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="shrink-0 h-8"
        onClick={() => navigate(`/messages?to=${strategist.id}`)}
      >
        <MessageCircle className="h-3.5 w-3.5 mr-1" />
        Message
      </Button>
    </div>
  );
}
