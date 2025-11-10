import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Phone,
  Mail,
  MessageSquare,
  FileText,
  Eye,
  Calendar,
  TrendingUp,
  User,
  Plus,
  Sparkles,
  Clock,
  Target
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface CandidateInteractionLogProps {
  candidateId: string;
  applicationId?: string;
  activeTab?: string;
  compact?: boolean;
  maxItems?: number;
}

interface Interaction {
  id: string;
  interaction_type: string;
  interaction_direction: string;
  title: string;
  content: string;
  summary?: string;
  metadata: any;
  tags: string[];
  created_by: string;
  created_at: string;
  ai_sentiment?: string;
  ai_key_points?: string[];
  scheduled_at?: string;
  completed_at?: string;
  visible_to_candidate: boolean;
  profiles?: {
    full_name: string;
    avatar_url?: string;
  };
}

const interactionIcons = {
  call: Phone,
  email: Mail,
  message: MessageSquare,
  note: FileText,
  meeting: Calendar,
  profile_view: Eye,
  job_view: Target,
  status_change: TrendingUp,
  document: FileText,
  rejection: TrendingUp,
  reconsider: TrendingUp,
  advance: TrendingUp,
};

const interactionColors = {
  call: "text-blue-500",
  email: "text-purple-500",
  message: "text-green-500",
  note: "text-yellow-500",
  meeting: "text-pink-500",
  profile_view: "text-gray-500",
  job_view: "text-indigo-500",
  status_change: "text-orange-500",
  document: "text-cyan-500",
  rejection: "text-red-500",
  reconsider: "text-green-500",
  advance: "text-blue-500",
};

export const CandidateInteractionLog = ({
  candidateId,
  applicationId,
  activeTab,
  compact = false,
  maxItems = 10,
}: CandidateInteractionLogProps) => {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingNote, setAddingNote] = useState(false);
  const [newNote, setNewNote] = useState({
    type: "note",
    title: "",
    content: "",
  });

  useEffect(() => {
    // Always load in compact mode, otherwise only when tab is active
    if (compact || activeTab === 'activity' || !activeTab) {
      loadInteractions();
    }
  }, [candidateId, activeTab, compact]);

  const loadInteractions = async () => {
    try {
      // Load interactions directly by candidateId
      const { data: interactionsData, error: interactionsError } = await supabase
        .from("candidate_interactions")
        .select("*")
        .eq("candidate_id", candidateId)
        .order("created_at", { ascending: false });

      if (interactionsError) throw interactionsError;

      // Load profile names separately for each interaction
      const interactionsWithProfiles = await Promise.all(
        (interactionsData || []).map(async (interaction) => {
          if (interaction.created_by) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name, avatar_url")
              .eq("id", interaction.created_by)
              .single();

            return {
              ...interaction,
              profiles: profile,
            };
          }
          return interaction;
        })
      );

      setInteractions(interactionsWithProfiles as Interaction[]);
    } catch (error) {
      console.error("Error loading interactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!candidateId || !newNote.content.trim()) {
      toast.error("Please enter note content");
      return;
    }

    setAddingNote(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("candidate_interactions").insert({
        candidate_id: candidateId,
        application_id: applicationId,
        interaction_type: newNote.type,
        interaction_direction: "internal",
        title: newNote.title || `${newNote.type.charAt(0).toUpperCase() + newNote.type.slice(1)} added`,
        content: newNote.content,
        created_by: user.id,
        is_internal: true,
        visible_to_candidate: false,
      });

      if (error) throw error;

      toast.success("Note added successfully");
      setNewNote({ type: "note", title: "", content: "" });
      loadInteractions();
    } catch (error) {
      console.error("Error adding note:", error);
      toast.error("Failed to add note");
    } finally {
      setAddingNote(false);
    }
  };

  const getInteractionIcon = (type: string) => {
    const Icon = interactionIcons[type as keyof typeof interactionIcons] || FileText;
    return Icon;
  };

  const getInteractionColor = (type: string) => {
    return interactionColors[type as keyof typeof interactionColors] || "text-gray-500";
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Interaction Timeline</CardTitle>
          <CardDescription>Loading candidate interactions...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!candidateId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Interaction Timeline</CardTitle>
          <CardDescription>No candidate profile found for this email</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent" />
              Interaction Timeline
            </CardTitle>
            <CardDescription>
              Complete audit trail of all candidate interactions
            </CardDescription>
          </div>
          <Badge variant="outline" className="gap-1">
            <Clock className="w-3 h-3" />
            {interactions.length} interactions
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Add New Note Section */}
        <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-accent" />
            <Label className="font-semibold">Log New Interaction</Label>
          </div>

          <Select
            value={newNote.type}
            onValueChange={(value) => setNewNote({ ...newNote, type: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="note">Note</SelectItem>
              <SelectItem value="call">Phone Call</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="message">Message</SelectItem>
              <SelectItem value="meeting">Meeting</SelectItem>
            </SelectContent>
          </Select>

          <Textarea
            placeholder="Enter interaction details..."
            value={newNote.content}
            onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
            rows={3}
          />

          <Button
            onClick={handleAddNote}
            disabled={addingNote || !newNote.content.trim()}
            className="w-full gap-2"
          >
            <Plus className="w-4 h-4" />
            {addingNote ? "Adding..." : "Add Interaction"}
          </Button>
        </div>

        <Separator />

        {/* Interactions Timeline */}
        <ScrollArea className="h-[500px] pr-4">
          {interactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Eye className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No interactions logged yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {interactions.map((interaction, index) => {
                const Icon = getInteractionIcon(interaction.interaction_type);
                const colorClass = getInteractionColor(interaction.interaction_type);

                return (
                  <div key={interaction.id} className="relative">
                    {/* Timeline line */}
                    {index < interactions.length - 1 && (
                      <div className="absolute left-[19px] top-[40px] w-[2px] h-[calc(100%+16px)] bg-border" />
                    )}

                    <div className="flex gap-4">
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-background border-2 border-border ${colorClass}`}>
                        <Icon className="w-5 h-5" />
                      </div>

                      <div className="flex-1 pb-6">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold">{interaction.title}</h4>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <User className="w-3 h-3" />
                              <span>{interaction.profiles?.full_name || "System"}</span>
                              <span>•</span>
                              <span>{formatDistanceToNow(new Date(interaction.created_at), { addSuffix: true })}</span>
                            </div>
                          </div>

                          <Badge variant="outline" className="capitalize">
                            {interaction.interaction_type.replace("_", " ")}
                          </Badge>
                        </div>

                        {interaction.content && (
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-2">
                            {interaction.content}
                          </p>
                        )}

                        {/* Display metadata for status changes */}
                        {interaction.metadata && interaction.interaction_type === 'status_change' && (
                          <div className="mt-2 p-2 bg-muted/30 rounded-md border border-border">
                            {interaction.metadata.action === 'reject' && (
                              <div className="space-y-1 text-xs">
                                <div className="font-semibold text-destructive">Rejection Details:</div>
                                {interaction.metadata.rejection_label && (
                                  <div>Reason: {interaction.metadata.rejection_label}</div>
                                )}
                                {interaction.metadata.stage && (
                                  <div>Stage: {interaction.metadata.stage}</div>
                                )}
                                {interaction.metadata.specific_gaps && interaction.metadata.specific_gaps.length > 0 && (
                                  <div>Gaps: {interaction.metadata.specific_gaps.join(', ')}</div>
                                )}
                              </div>
                            )}
                            {interaction.metadata.action === 'advance' && (
                              <div className="space-y-1 text-xs">
                                <div className="font-semibold text-primary">Advancement Details:</div>
                                <div>From: {interaction.metadata.previous_stage} → To: {interaction.metadata.new_stage}</div>
                                {interaction.metadata.skills_match && (
                                  <div className="flex gap-2 mt-1">
                                    <Badge variant="secondary" className="text-xs">Skills: {interaction.metadata.skills_match}/10</Badge>
                                    <Badge variant="secondary" className="text-xs">Culture: {interaction.metadata.culture_fit}/10</Badge>
                                    <Badge variant="secondary" className="text-xs">Comm: {interaction.metadata.communication}/10</Badge>
                                  </div>
                                )}
                              </div>
                            )}
                            {interaction.metadata.action === 'reconsider' && (
                              <div className="space-y-1 text-xs">
                                <div className="font-semibold text-green-500">Reconsideration Details:</div>
                                <div>Status: {interaction.metadata.previous_status} → {interaction.metadata.new_status}</div>
                                {interaction.metadata.previous_rejection_reason && (
                                  <div>Previous reason: {interaction.metadata.previous_rejection_reason}</div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {interaction.ai_sentiment && (
                          <Badge variant="secondary" className="mt-2">
                            Sentiment: {interaction.ai_sentiment}
                          </Badge>
                        )}

                        {interaction.metadata && interaction.interaction_type !== 'status_change' && Object.keys(interaction.metadata).length > 0 && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            {JSON.stringify(interaction.metadata, null, 2)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};