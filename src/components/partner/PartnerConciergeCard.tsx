import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useStrategistAssignment } from "@/hooks/usePartnerAnalytics";
import { MessageSquare, Calendar, Mail, Clock, Activity, User, Sparkles } from "lucide-react";
import { CardLoadingSkeleton } from "@/components/LoadingSkeletons";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

interface PartnerConciergeCardProps {
  companyId: string;
}

interface StrategistData {
  id: string;
  full_name: string;
  title?: string;
  bio?: string;
  avatar_url?: string;
  email?: string;
  is_available?: boolean;
}

export function PartnerConciergeCard({ companyId }: PartnerConciergeCardProps) {
  const { data: assignment, isLoading: assignmentLoading } = useStrategistAssignment(companyId);
  const [strategistDetails, setStrategistDetails] = useState<StrategistData | null>(null);
  const [recentUpdates, setRecentUpdates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const assignmentData = assignment as any;
    if (assignmentData?.strategist) {
      // Use the assigned strategist from company_strategist_assignments
      const s = assignmentData.strategist;
      setStrategistDetails({
        id: s.id,
        full_name: s.full_name || 'Your Strategist',
        avatar_url: s.avatar_url,
        email: s.email,
        is_available: true // Could be enhanced with real-time status
      });
      setLoading(false);
      fetchStrategistMetadata(s.id);
    } else if (!assignmentLoading) {
      // Fallback: fetch first active strategist from talent_strategists
      fetchFallbackStrategist();
    }
  }, [assignment, assignmentLoading]);

  const fetchStrategistMetadata = async (userId: string) => {
    try {
      // Try to get additional details from talent_strategists
      const { data } = await (supabase as any)
        .from('talent_strategists')
        .select('title, bio, availability')
        .eq('user_id', userId)
        .maybeSingle();

      if (data && strategistDetails) {
        setStrategistDetails(prev => prev ? {
          ...prev,
          title: data.title || prev.title,
          bio: data.bio || prev.bio,
          is_available: data.availability === 'available'
        } : null);
      }
    } catch (e) {
      // Silent fail - optional metadata
    }
  };

  const fetchFallbackStrategist = async (): Promise<void> => {
    try {
      const { data, error } = await (supabase as any)
        .from('talent_strategists')
        .select('id, user_id, full_name, title, bio, email, availability, photo_url')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setStrategistDetails({
          id: data.user_id || data.id,
          full_name: data.full_name,
          title: data.title || undefined,
          bio: data.bio || undefined,
          avatar_url: data.photo_url || undefined,
          email: data.email || undefined,
          is_available: data.availability === 'available',
        });
      }
    } catch (error) {
      console.error('Error fetching strategist:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentUpdates();
  }, [companyId]);

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

  if (loading || assignmentLoading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardLoadingSkeleton />
        </CardHeader>
      </Card>
    );
  }

  if (!strategistDetails) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="glass-card border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-full bg-primary/10 border border-primary/20">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <span>Your Concierge is Being Assigned</span>
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    In Progress
                  </Badge>
                </CardTitle>
                <CardDescription className="mt-1">
                  A dedicated talent strategist will be assigned to provide you with white-glove service within 24 hours
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 rounded-lg p-4 flex items-center gap-3 border border-border/50">
              <Clock className="w-5 h-5 text-primary" />
              <p className="text-sm text-muted-foreground">
                Need immediate assistance? Contact us at <a href="mailto:partners@thequantumclub.com" className="text-primary hover:underline">partners@thequantumclub.com</a>
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  const initials = strategistDetails.full_name
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
                  <AvatarImage src={strategistDetails.avatar_url} alt={strategistDetails.full_name} />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {strategistDetails.is_available && (
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
                  {strategistDetails.full_name}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {strategistDetails.title || 'Senior Partner Strategist'}
                </p>
              </div>
            </div>

            <Badge 
              variant={strategistDetails.is_available ? "default" : "secondary"} 
              className={`flex items-center gap-1.5 ${
                strategistDetails.is_available 
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' 
                  : ''
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${strategistDetails.is_available ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'}`} />
              {strategistDetails.is_available ? 'Available Now' : 'Busy'}
            </Badge>
          </div>

          {strategistDetails.bio && (
            <CardDescription className="mt-4 text-sm leading-relaxed">
              {strategistDetails.bio}
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
          {strategistDetails.email && (
            <div className="pt-4 border-t border-border/50 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Direct Contact
              </p>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <a 
                  href={`mailto:${strategistDetails.email}`} 
                  className="hover:text-primary transition-colors"
                >
                  {strategistDetails.email}
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
                {strategistDetails.is_available ? '< 4 hours guaranteed' : 'Within 24 hours'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
