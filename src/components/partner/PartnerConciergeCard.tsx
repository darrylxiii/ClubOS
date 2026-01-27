import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, Calendar, Mail, Clock, Activity, User } from "lucide-react";
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
      <Card className="glass-card">
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
        <Card className="glass-card border-dashed">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-full bg-muted border border-border">
                <User className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <span>Concierge Assignment</span>
                  <Badge variant="secondary">
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
      <Card className="glass-card group hover:border-primary/30 transition-all duration-300">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-5">
              <div className="relative">
                <Avatar className="h-16 w-16 border-2 border-border">
                  <AvatarImage src={strategist.avatar_url} alt={strategist.full_name} />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {strategist.is_available && (
                  <motion.div 
                    className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-3 border-background"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </div>
              
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Your Dedicated Concierge
                </p>
                <CardTitle className="text-xl font-bold tracking-tight">
                  {strategist.full_name}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {strategist.title || 'Senior Partner Strategist'}
                </p>
              </div>
            </div>

            <Badge 
              variant={strategist.is_available ? "default" : "secondary"} 
              className={`flex items-center gap-1.5 ${
                strategist.is_available 
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' 
                  : ''
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${strategist.is_available ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'}`} />
              {strategist.is_available ? 'Available Now' : 'Busy'}
            </Badge>
          </div>

          {strategist.bio && (
            <CardDescription className="mt-4 text-sm leading-relaxed">
              {strategist.bio}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button className="w-full" asChild>
              <Link to="/messages">
                <MessageSquare className="w-4 h-4 mr-2" />
                Message
              </Link>
            </Button>

            <Button variant="outline" className="w-full" asChild>
              <Link to="/calendar">
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Call
              </Link>
            </Button>
          </div>

          {/* Contact Info */}
          {strategist.email && (
            <div className="pt-4 border-t border-border/50 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Direct Contact
              </p>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <a 
                  href={`mailto:${strategist.email}`} 
                  className="hover:text-primary transition-colors"
                >
                  {strategist.email}
                </a>
              </div>
            </div>
          )}

          {/* Recent Updates */}
          {recentUpdates.length > 0 && (
            <div className="pt-4 border-t border-border/50 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
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
                    <span className="text-primary mt-1.5">•</span>
                    <span className="text-muted-foreground">{update}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          )}

          {/* Response SLA */}
          <div className="bg-muted/50 rounded-lg p-4 flex items-center gap-3 border border-border/50">
            <div className="p-2 rounded-full bg-primary/10">
              <Clock className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Response SLA</p>
              <p className="text-xs text-muted-foreground">
                {strategist.is_available ? '< 4 hours guaranteed' : 'Within 24 hours'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
