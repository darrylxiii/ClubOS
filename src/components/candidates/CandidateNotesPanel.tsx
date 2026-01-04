import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  StickyNote, Plus, Pin, ChevronDown, ChevronUp, 
  Clock, User, Trash2, Edit2, Save, X 
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface CandidateNotesPanelProps {
  candidateId: string;
}

type NoteType = "general" | "interview" | "feedback" | "follow_up" | "concern" | "positive";

const noteTypeColors: Record<NoteType, string> = {
  general: "bg-muted text-muted-foreground",
  interview: "bg-blue-500/10 text-blue-600",
  feedback: "bg-purple-500/10 text-purple-600",
  follow_up: "bg-orange-500/10 text-orange-600",
  concern: "bg-destructive/10 text-destructive",
  positive: "bg-green-500/10 text-green-600",
};

export function CandidateNotesPanel({ candidateId }: CandidateNotesPanelProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [noteType, setNoteType] = useState<NoteType>("general");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["candidate-notes", candidateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidate_notes")
        .select(`
          *,
          profiles:created_by(full_name, avatar_url)
        `)
        .eq("candidate_id", candidateId)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const createNote = useMutation({
    mutationFn: async () => {
      if (!newNote.trim() || !user) return;

      const { error } = await supabase.from("candidate_notes").insert({
        candidate_id: candidateId,
        created_by: user.id,
        content: newNote.trim(),
        note_type: noteType,
        visibility: "team",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidate-notes", candidateId] });
      setNewNote("");
      setNoteType("general");
      toast.success("Note added");
    },
    onError: () => toast.error("Failed to add note"),
  });

  const updateNote = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { error } = await supabase
        .from("candidate_notes")
        .update({ content, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidate-notes", candidateId] });
      setEditingId(null);
      toast.success("Note updated");
    },
    onError: () => toast.error("Failed to update note"),
  });

  const togglePin = useMutation({
    mutationFn: async ({ id, isPinned }: { id: string; isPinned: boolean }) => {
      const { error } = await supabase
        .from("candidate_notes")
        .update({ pinned: !isPinned })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidate-notes", candidateId] });
    },
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("candidate_notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidate-notes", candidateId] });
      toast.success("Note deleted");
    },
    onError: () => toast.error("Failed to delete note"),
  });

  return (
    <Card>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <StickyNote className="h-4 w-4" />
                Team Notes
                <Badge variant="secondary" className="ml-2">{notes.length}</Badge>
              </CardTitle>
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Add New Note */}
            <div className="space-y-2 p-3 rounded-lg border bg-muted/30">
              <div className="flex gap-2">
                <Select value={noteType} onValueChange={(v) => setNoteType(v as NoteType)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="interview">Interview</SelectItem>
                    <SelectItem value="feedback">Feedback</SelectItem>
                    <SelectItem value="follow_up">Follow Up</SelectItem>
                    <SelectItem value="positive">Positive</SelectItem>
                    <SelectItem value="concern">Concern</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note about this candidate..."
                rows={2}
              />
              <Button 
                size="sm" 
                onClick={() => createNote.mutate()}
                disabled={!newNote.trim() || createNote.isPending}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Note
              </Button>
            </div>

            {/* Notes List */}
            <ScrollArea className="h-[300px]">
              <div className="space-y-3 pr-4">
                {isLoading ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Loading notes...</p>
                ) : notes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No notes yet</p>
                ) : (
                  notes.map((note: any) => (
                    <div
                      key={note.id}
                      id={`note-${note.id}`}
                      className={`p-3 rounded-lg border space-y-2 ${
                        note.pinned ? "border-primary/50 bg-primary/5" : "bg-card"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={noteTypeColors[note.note_type as NoteType] || noteTypeColors.general}>
                            {note.note_type}
                          </Badge>
                          {note.pinned && <Pin className="h-3 w-3 text-primary" />}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => togglePin.mutate({ id: note.id, isPinned: note.pinned })}
                          >
                            <Pin className={`h-3 w-3 ${note.pinned ? "fill-primary" : ""}`} />
                          </Button>
                          {user?.id === note.created_by && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => {
                                  setEditingId(note.id);
                                  setEditContent(note.content);
                                }}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive"
                                onClick={() => deleteNote.mutate(note.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {editingId === note.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              onClick={() => updateNote.mutate({ id: note.id, content: editContent })}
                            >
                              <Save className="h-3 w-3 mr-1" />
                              Save
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => setEditingId(null)}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                      )}

                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {note.profiles?.full_name || "Unknown"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
