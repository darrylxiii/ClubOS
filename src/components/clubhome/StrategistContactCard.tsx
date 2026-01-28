import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle, 
  Calendar, 
  User,
  Sparkles,
  Phone,
  Mail
} from "lucide-react";
import { motion } from "framer-motion";

interface Strategist {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  current_title: string | null;
}

export function StrategistContactCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [strategist, setStrategist] = useState<Strategist | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStrategist();
    }
  }, [user]);

  const fetchStrategist = async () => {
    if (!user) return;
    
    try {
      // First get the candidate profile with strategist assignment
      const { data: candidateProfile, error: profileError } = await supabase
        .from('candidate_profiles')
        .select('assigned_strategist_id')
        .eq('id', user.id)
        .single();

      if (profileError || !candidateProfile?.assigned_strategist_id) {
        setStrategist(null);
        setLoading(false);
        return;
      }

      // Fetch strategist profile
      const { data: strategistData, error: strategistError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, current_title')
        .eq('id', candidateProfile.assigned_strategist_id)
        .single();

      if (strategistError || !strategistData) {
        setStrategist(null);
        return;
      }

      setStrategist(strategistData);
    } catch (error) {
      console.error('Error fetching strategist:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSendMessage = () => {
    if (strategist) {
      // Navigate to messages with the strategist pre-selected
      navigate(`/messages?to=${strategist.id}`);
    }
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-muted"></div>
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="h-3 bg-muted rounded w-1/3"></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!strategist) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-black uppercase">
            <div className="w-1 h-6 bg-foreground"></div>
            <User className="w-5 h-5" />
            Your Strategist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-muted/50 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                A dedicated strategist will be assigned to you soon
              </p>
              <p className="text-xs text-muted-foreground">
                They'll help guide your career journey
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-border/50 hover:shadow-lg transition-all">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg font-black uppercase">
              <div className="w-1 h-6 bg-foreground"></div>
              <User className="w-5 h-5" />
              Your Strategist
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              <Sparkles className="w-3 h-3 mr-1" />
              TQC Team
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Strategist Profile */}
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border-2 border-primary/20">
              <AvatarImage src={strategist.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {getInitials(strategist.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold truncate">{strategist.full_name}</h4>
              <p className="text-sm text-muted-foreground truncate">
                {strategist.current_title || "Talent Strategist"}
              </p>
            </div>
          </div>

          {/* Contact Actions */}
          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="default"
              className="w-full"
              onClick={handleSendMessage}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Message
            </Button>
            <Button 
              variant="outline"
              className="w-full"
              onClick={() => navigate('/meetings')}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Schedule
            </Button>
          </div>

          {/* Quick Contact Info */}
          <div className="pt-2 border-t border-border/30">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Mail className="w-3 h-3" />
              <span className="truncate">{strategist.email}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
