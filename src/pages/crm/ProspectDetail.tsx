import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { RoleGate } from '@/components/RoleGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  Linkedin, 
  Building, 
  MapPin,
  Calendar,
  Zap,
  MessageSquare,
  Edit,
  Trash2,
  Clock,
  Send,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PROSPECT_STAGES, type CRMProspect, type CRMTouchpoint } from '@/types/crm-enterprise';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ProspectScoreCard } from '@/components/crm/ProspectScoreCard';
import { AIReplySuggestion } from '@/components/crm/AIReplySuggestion';
import { ActivityList } from '@/components/crm/ActivityList';
import { ActivityQuickAdd } from '@/components/crm/ActivityQuickAdd';
import { RottingIndicator } from '@/components/crm/RottingIndicator';
import { differenceInDays } from 'date-fns';

export default function ProspectDetail() {
  const { prospectId } = useParams<{ prospectId: string }>();
  const navigate = useNavigate();
  const [prospect, setProspect] = useState<CRMProspect | null>(null);
  const [touchpoints, setTouchpoints] = useState<CRMTouchpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    if (prospectId) {
      fetchProspect();
      fetchTouchpoints();
    }
  }, [prospectId]);

  const fetchProspect = async () => {
    try {
      const { data, error } = await supabase
        .from('crm_prospects')
        .select(`
          *,
          owner:profiles!crm_prospects_owner_id_fkey(full_name, avatar_url),
          campaign:crm_campaigns!crm_prospects_campaign_id_fkey(name)
        `)
        .eq('id', prospectId)
        .single();

      if (error) throw error;

      setProspect({
        ...data,
        owner_name: data.owner?.full_name,
        owner_avatar: data.owner?.avatar_url,
        campaign_name: data.campaign?.name,
      } as CRMProspect);
      setNotes(data.notes || '');
    } catch (error) {
      console.error('Error fetching prospect:', error);
      toast.error('Failed to load prospect');
    } finally {
      setLoading(false);
    }
  };

  const fetchTouchpoints = async () => {
    try {
      const { data, error } = await supabase
        .from('crm_touchpoints')
        .select('*')
        .eq('prospect_id', prospectId)
        .order('performed_at', { ascending: false });

      if (error) throw error;
      setTouchpoints(data as CRMTouchpoint[]);
    } catch (error) {
      console.error('Error fetching touchpoints:', error);
    }
  };

  const handleStageChange = async (newStage: string) => {
    if (!prospect) return;
    
    try {
      const { error } = await supabase
        .from('crm_prospects')
        .update({ stage: newStage, updated_at: new Date().toISOString() })
        .eq('id', prospect.id);

      if (error) throw error;

      setProspect({ ...prospect, stage: newStage as any });
      toast.success(`Stage updated to ${newStage}`);
    } catch (error) {
      console.error('Error updating stage:', error);
      toast.error('Failed to update stage');
    }
  };

  const handleSaveNotes = async () => {
    if (!prospect) return;
    
    setSavingNotes(true);
    try {
      const { error } = await supabase
        .from('crm_prospects')
        .update({ notes, updated_at: new Date().toISOString() })
        .eq('id', prospect.id);

      if (error) throw error;
      toast.success('Notes saved');
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error('Failed to save notes');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleDelete = async () => {
    if (!prospect) return;
    
    try {
      const { error } = await supabase
        .from('crm_prospects')
        .delete()
        .eq('id', prospect.id);

      if (error) throw error;

      toast.success('Prospect deleted');
      navigate('/crm/prospects');
    } catch (error) {
      console.error('Error deleting prospect:', error);
      toast.error('Failed to delete prospect');
    }
  };

  const stageConfig = PROSPECT_STAGES.find(s => s.value === prospect?.stage);

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-6 max-w-6xl space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!prospect) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-6 text-center">
          <p className="text-muted-foreground">Prospect not found</p>
          <Button asChild className="mt-4">
            <Link to="/crm/prospects">Back to Pipeline</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <RoleGate allowedRoles={['admin', 'strategist']}>
        <div className="container mx-auto px-4 py-6 max-w-6xl space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link to="/crm/prospects">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{prospect.full_name}</h1>
                <div className="flex items-center gap-2 text-muted-foreground">
                  {prospect.job_title && <span>{prospect.job_title}</span>}
                  {prospect.company_name && (
                    <>
                      <span>•</span>
                      <span>{prospect.company_name}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={prospect.stage} onValueChange={handleStageChange}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROSPECT_STAGES.map(stage => (
                    <SelectItem key={stage.value} value={stage.value}>
                      {stage.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="icon" className="text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Prospect?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the prospect and all associated data.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="md:col-span-2 space-y-6">
              {/* Contact Info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
                  <CardHeader>
                    <CardTitle className="text-lg">Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="grid sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Mail className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <a href={`mailto:${prospect.email}`} className="text-sm hover:text-primary">
                          {prospect.email}
                        </a>
                      </div>
                    </div>
                    {prospect.phone && (
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-500/10">
                          <Phone className="w-4 h-4 text-green-500" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Phone</p>
                          <a href={`tel:${prospect.phone}`} className="text-sm hover:text-primary">
                            {prospect.phone}
                          </a>
                        </div>
                      </div>
                    )}
                    {prospect.linkedin_url && (
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                          <Linkedin className="w-4 h-4 text-blue-500" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">LinkedIn</p>
                          <a 
                            href={prospect.linkedin_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm hover:text-primary"
                          >
                            View Profile
                          </a>
                        </div>
                      </div>
                    )}
                    {prospect.company_name && (
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-500/10">
                          <Building className="w-4 h-4 text-purple-500" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Company</p>
                          <p className="text-sm">{prospect.company_name}</p>
                        </div>
                      </div>
                    )}
                    {prospect.location && (
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-orange-500/10">
                          <MapPin className="w-4 h-4 text-orange-500" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Location</p>
                          <p className="text-sm">{prospect.location}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Notes */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">Notes</CardTitle>
                    <Button 
                      size="sm" 
                      onClick={handleSaveNotes}
                      disabled={savingNotes}
                    >
                      {savingNotes ? 'Saving...' : 'Save Notes'}
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add notes about this prospect..."
                      className="min-h-32 bg-muted/20 border-border/30"
                    />
                  </CardContent>
                </Card>
              </motion.div>

              {/* Activities */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Activities
                    </CardTitle>
                    <ActivityQuickAdd 
                      prospectId={prospect.id}
                      onSuccess={() => {}}
                    />
                  </CardHeader>
                  <CardContent>
                    <ActivityList prospectId={prospect.id} />
                  </CardContent>
                </Card>
              </motion.div>

              {/* Touchpoint Timeline */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      Communication Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {touchpoints.length > 0 ? (
                      <div className="space-y-4">
                        {touchpoints.map((touchpoint, index) => (
                          <div 
                            key={touchpoint.id}
                            className="flex gap-4 relative"
                          >
                            {index < touchpoints.length - 1 && (
                              <div className="absolute left-4 top-8 bottom-0 w-px bg-border/50" />
                            )}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                              touchpoint.direction === 'outbound' 
                                ? 'bg-blue-500/20 text-blue-500' 
                                : 'bg-green-500/20 text-green-500'
                            }`}>
                              {touchpoint.direction === 'outbound' ? (
                                <Send className="w-4 h-4" />
                              ) : (
                                <MessageSquare className="w-4 h-4" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm capitalize">
                                  {touchpoint.touchpoint_type.replace('_', ' ')}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {touchpoint.channel}
                                </Badge>
                                {touchpoint.opened && (
                                  <CheckCircle className="w-3 h-3 text-green-500" />
                                )}
                                {touchpoint.bounced && (
                                  <XCircle className="w-3 h-3 text-red-500" />
                                )}
                              </div>
                              {touchpoint.subject && (
                                <p className="text-sm text-muted-foreground truncate">
                                  {touchpoint.subject}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(touchpoint.performed_at), 'PPp')}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">
                        No touchpoints recorded yet
                      </p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Lead Score Card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <ProspectScoreCard prospectId={prospect.id} />
              </motion.div>

              {/* AI Reply Suggestion */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 }}
              >
                <AIReplySuggestion 
                  prospectName={prospect.full_name}
                  prospectCompany={prospect.company_name || ''}
                  originalEmail=""
                  classification={prospect.reply_sentiment || 'neutral'}
                />
              </motion.div>

              {/* Campaign */}
              {prospect.campaign_name && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
                    <CardHeader>
                      <CardTitle className="text-lg">Campaign</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Link 
                        to="/crm/campaigns"
                        className="text-sm hover:text-primary transition-colors"
                      >
                        {prospect.campaign_name}
                      </Link>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Quick Actions */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <a href={`mailto:${prospect.email}`}>
                        <Mail className="w-4 h-4 mr-2" />
                        Send Email
                      </a>
                    </Button>
                    {prospect.phone && (
                      <Button variant="outline" className="w-full justify-start" asChild>
                        <a href={`tel:${prospect.phone}`}>
                          <Phone className="w-4 h-4 mr-2" />
                          Call
                        </a>
                      </Button>
                    )}
                    {prospect.linkedin_url && (
                      <Button variant="outline" className="w-full justify-start" asChild>
                        <a href={prospect.linkedin_url} target="_blank" rel="noopener noreferrer">
                          <Linkedin className="w-4 h-4 mr-2" />
                          View LinkedIn
                        </a>
                      </Button>
                    )}
                    <Button variant="outline" className="w-full justify-start">
                      <Calendar className="w-4 h-4 mr-2" />
                      Schedule Follow-up
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </RoleGate>
    </AppLayout>
  );
}
