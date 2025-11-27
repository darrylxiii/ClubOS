import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, Calendar, Mail, Phone, Clock, Activity } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

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
            const { data, error } = await supabase
                .from('talent_strategists')
                .select('*')
                .eq('is_active', true)
                .limit(1)
                .single();

            if (error) throw error;
            
            // Use data fields directly without type conversion
            if (data) {
                setStrategist({
                    id: data.id,
                    user_id: data.id, // Use id as user_id fallback
                    full_name: data.full_name,
                    title: data.title,
                    bio: data.bio,
                    avatar_url: (data as any).photo_url || (data as any).avatar_url,
                    email: data.email,
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
            // Fetch recent interactions/activities from strategist for this company
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

    const handleMessageClick = () => {
        // Navigate to messages
        toast.info('Opening messages...');
    };

    if (loading) {
        return (
            <Card className="glass-card">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-full bg-gradient-to-br from-accent to-purple-500 animate-pulse">
                            <Activity className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-xl">Loading...</CardTitle>
                            <CardDescription>Fetching your concierge</CardDescription>
                        </div>
                    </div>
                </CardHeader>
            </Card>
        );
    }

    if (!strategist) {
        return (
            <Card className="glass-card border-dashed">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-full bg-muted">
                            <Activity className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div>
                            <CardTitle className="text-xl">Concierge Assignment Pending</CardTitle>
                            <CardDescription>
                                A dedicated talent strategist will be assigned to you shortly
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
            </Card>
        );
    }

    const initials = strategist.full_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return (
        <Card className="glass-card border-accent/20">
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Avatar className="h-16 w-16 border-2 border-accent">
                                <AvatarImage src={strategist.avatar_url} alt={strategist.full_name} />
                                <AvatarFallback className="bg-gradient-to-br from-accent to-purple-500 text-white font-bold">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                            {strategist.is_available && (
                                <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-background" />
                            )}
                        </div>
                        <div>
                            <CardTitle className="text-2xl font-black uppercase tracking-tight mb-1">
                                🎩 Your Dedicated Concierge
                            </CardTitle>
                            <div className="space-y-1">
                                <p className="text-lg font-semibold">{strategist.full_name}</p>
                                <p className="text-sm text-muted-foreground">{strategist.title || 'Senior Partner Strategist'}</p>
                            </div>
                        </div>
                    </div>

                    <Badge variant={strategist.is_available ? "default" : "secondary"} className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {strategist.is_available ? 'Available' : 'Busy'}
                    </Badge>
                </div>

                {strategist.bio && (
                    <CardDescription className="mt-3">
                        {strategist.bio}
                    </CardDescription>
                )}
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-2">
                    <Button
                        variant="default"
                        className="w-full bg-gradient-to-r from-accent to-purple-500"
                        onClick={handleMessageClick}
                        asChild
                    >
                        <Link to="/messages">
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Message {strategist.full_name.split(' ')[0]}
                        </Link>
                    </Button>

                    {strategist.calendly_link && (
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => window.open(strategist.calendly_link, '_blank')}
                        >
                            <Calendar className="w-4 h-4 mr-2" />
                            Schedule Call
                        </Button>
                    )}
                </div>

                {/* Contact Info (Optional - can be hidden initially) */}
                {strategist.email && (
                    <div className="pt-3 border-t space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Direct Contact
                        </p>
                        <div className="flex items-center gap-2 text-sm">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <a href={`mailto:${strategist.email}`} className="hover:underline">
                                {strategist.email}
                            </a>
                        </div>
                    </div>
                )}

                {/* Recent Updates */}
                {recentUpdates.length > 0 && (
                    <div className="pt-3 border-t space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                            <Activity className="w-3 h-3" />
                            Recent Updates
                        </p>
                        <ul className="space-y-1.5">
                            {recentUpdates.map((update, idx) => (
                                <li key={idx} className="text-sm flex items-start gap-2">
                                    <span className="text-accent mt-1">•</span>
                                    <span className="text-muted-foreground">{update}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* SLA Badge */}
                <div className="bg-accent/10 rounded-lg p-3 flex items-center gap-2">
                    <div className="p-2 rounded-full bg-accent/20">
                        <Clock className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                        <p className="text-sm font-medium">Response Time SLA</p>
                        <p className="text-xs text-muted-foreground">
                            {strategist.is_available ? '< 24 hours guaranteed' : 'Within 48 hours'}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
