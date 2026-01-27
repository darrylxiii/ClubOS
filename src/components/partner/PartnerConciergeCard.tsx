import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, Calendar, Mail, Clock, Activity, Crown, Sparkles } from "lucide-react";
import { CardLoadingSkeleton } from "@/components/LoadingSkeletons";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

interface PartnerConciergeCardProps {
  companyId: string;
}

interface Strategist {
  id: string;
  user_id: string;
  full_name: string;
  title?: string;
  bio?: string;
  avatar_url?: string;
  email?: string;
  calendly_link?: string;
  is_available?: boolean;
}

export function PartnerConciergeCard({ companyId }: PartnerConciergeCardProps) {
  const [strategist, setStrategist] = useState<Strategist | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentUpdates, setRecentUpdates] = useState<string[]>([]);

  useEffect(() => {
    fetchAssignedStrategist();
    fetchRecentUpdates();
  }, [companyId]);

  const fetchAssignedStrategist = async (): Promise<void> => {
    try {
      const { data, error } = await (supabase as any)
        .from('talent_strategists')
        .select('id, full_name, title, bio, email, availability, photo_url')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setStrategist({
          id: data.id,
          user_id: data.id,
          full_name: data.full_name,
          title: data.title || undefined,
          bio: data.bio || undefined,
          avatar_url: data.photo_url || undefined,
          email: data.email || undefined,
          calendly_link: undefined,
          is_available: data.availability === 'available',
        });
      }
    } catch (error) {
      console.error('Error fetching strategist:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentUpdates = async (): Promise<void> => {
    try {
      const { data } = await supabase
        .from('candidate_interactions')
        .select('title, created_at')
        .eq('is_internal', false)
        .order('created_at', { ascending: false })
        .limit(3);

      if (data) {
        setRecentUpdates(data.map((d: { title: string | null }) => d.title || 'Update'));
      }
    } catch (error) {
      console.error('Error fetching updates:', error);
    }
  };

  if (loading) {
    return (
      <Card className="glass-card border-2 border-gold/30">
        <CardHeader>
          <CardLoadingSkeleton />
        </CardHeader>
      </Card>
    );
  }

  if (!strategist) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="relative overflow-hidden border-2 border-dashed border-gold/30 bg-gradient-to-br from-card via-card to-gold/5">
          {/* Decorative gold line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
          
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-full bg-gold/10 border border-gold/20">
                <Crown className="w-8 h-8 text-gold" />
              </div>
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <span>Elite Concierge Assignment</span>
                  <Badge variant="outline" className="border-gold/50 text-gold bg-gold/10">
                    Coming Soon
                  </Badge>
                </CardTitle>
                <CardDescription className="mt-1">
                  Your dedicated talent strategist will be assigned shortly to provide white-glove service
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </motion.div>
    );
  }

  const initials = strategist.full_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="relative overflow-hidden border-2 border-gold/30 bg-gradient-to-br from-card via-card to-gold/5">
        {/* Premium gold accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gold/30 via-gold to-gold/30" />
        
        {/* Subtle glow effect */}
        <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-gold/10 blur-3xl" />
        
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-5">
              {/* Premium Avatar with gold ring */}
              <div className="relative">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-gold via-gold/50 to-gold/30 opacity-75" />
                <Avatar className="relative h-20 w-20 border-4 border-background">
                  <AvatarImage src={strategist.avatar_url} alt={strategist.full_name} />
                  <AvatarFallback className="bg-gradient-to-br from-gold/30 to-gold/10 text-gold font-bold text-xl">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {/* Availability pulse */}
                {strategist.is_available && (
                  <motion.div 
                    className="absolute -bottom-1 -right-1 w-6 h-6 bg-success rounded-full border-4 border-background"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-gold" />
                  <span className="text-sm font-semibold uppercase tracking-wider text-gold">
                    Your Dedicated Concierge
                  </span>
                </div>
                <CardTitle className="text-2xl font-bold tracking-tight">
                  {strategist.full_name}
                </CardTitle>
                <p className="text-muted-foreground">
                  {strategist.title || 'Senior Partner Strategist'}
                </p>
              </div>
            </div>

            <Badge 
              variant={strategist.is_available ? "default" : "secondary"} 
              className={`flex items-center gap-1.5 px-3 py-1.5 ${
                strategist.is_available 
                  ? 'bg-success/20 text-success border-success/30' 
                  : ''
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${strategist.is_available ? 'bg-success animate-pulse' : 'bg-muted-foreground'}`} />
              {strategist.is_available ? 'Available Now' : 'Busy'}
            </Badge>
          </div>

          {strategist.bio && (
            <CardDescription className="mt-4 text-base leading-relaxed">
              {strategist.bio}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Premium Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              className="w-full bg-gradient-to-r from-gold to-gold-muted text-gold-foreground hover:from-gold/90 hover:to-gold-muted/90 shadow-lg"
              asChild
            >
              <Link to="/messages">
                <MessageSquare className="w-4 h-4 mr-2" />
                Message {strategist.full_name.split(' ')[0]}
              </Link>
            </Button>

            <Button
              variant="outline"
              className="w-full border-gold/30 hover:bg-gold/10 hover:border-gold/50"
              asChild
            >
              <Link to="/calendar">
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Call
              </Link>
            </Button>
          </div>

          {/* Contact Info */}
          {strategist.email && (
            <div className="pt-4 border-t border-border/50 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-gold" />
                Direct Line
              </p>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <a 
                  href={`mailto:${strategist.email}`} 
                  className="hover:text-gold transition-colors"
                >
                  {strategist.email}
                </a>
              </div>
            </div>
          )}

          {/* Recent Updates */}
          {recentUpdates.length > 0 && (
            <div className="pt-4 border-t border-border/50 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-3 h-3" />
                Recent Activity
              </p>
              <ul className="space-y-2">
                {recentUpdates.map((update, idx) => (
                  <motion.li 
                    key={idx} 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="text-sm flex items-start gap-2"
                  >
                    <span className="text-gold mt-1.5">•</span>
                    <span className="text-muted-foreground">{update}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          )}

          {/* Premium SLA Badge */}
          <div className="bg-gradient-to-r from-gold/10 via-gold/5 to-gold/10 rounded-xl p-4 flex items-center gap-3 border border-gold/20">
            <div className="p-2.5 rounded-full bg-gold/20">
              <Clock className="w-5 h-5 text-gold" />
            </div>
            <div>
              <p className="text-sm font-semibold">Premium Response SLA</p>
              <p className="text-xs text-muted-foreground">
                {strategist.is_available ? '< 4 hours guaranteed' : 'Within 24 hours'}
              </p>
            </div>
            <Badge variant="outline" className="ml-auto border-gold/30 text-gold text-xs">
              Elite
            </Badge>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}