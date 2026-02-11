import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Lock, Users, Globe, Pin, Plus, Save, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";

interface Note {
  id: string;
  note_type: 'tqc_internal' | 'partner_shared' | 'general';
  title: string | null;
  content: string;
  created_by: string;
  visibility: string;
  tags: string[];
  pinned: boolean;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string;
  };
}

interface Props {
  candidateId: string;
  userRole: 'admin' | 'strategist' | 'partner' | 'candidate';
  activeTab?: string;
}

export const CandidateNotesManager = ({ candidateId, userRole, activeTab }: Props) => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newNote, setNewNote] = useState({
    type: 'tqc_internal' as 'tqc_internal' | 'partner_shared' | 'general',
    title: '',
    content: '',
    tags: [] as string[]
  });

  useEffect(() => {
    // Only load when the team-assessment tab is active
    if (activeTab === 'team-assessment') {
      loadNotes();
    }
  }, [candidateId, activeTab]);

  const loadNotes = async () => {
    let query = supabase
      .from('candidate_notes')
      .select('*, profiles(full_name)')
      .eq('candidate_id', candidateId)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false });

    // Filter out TQC Internal notes for partners
    if (userRole === 'partner') {
      query = query.neq('note_type', 'tqc_internal');
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error loading notes:', error);
      return;
    }

    setNotes((data as any) || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!newNote.content.trim()) {
      toast.error('Note content is required');
      return;
    }

    if (!user?.id) {
      toast.error('You must be logged in to create notes');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('candidate_notes')
        .insert([{
          candidate_id: candidateId,
          note_type: newNote.type,
          title: newNote.title.trim() || null,
          content: newNote.content,
          tags: newNote.tags,
          created_by: user.id
        }] as any)
        .select()
        .single();

      if (error) throw error;

      toast.success('Note saved');
      
      // Reset to appropriate default for role
      const defaultType = userRole === 'partner' ? 'partner_shared' : 'tqc_internal';
      setNewNote({ type: defaultType as any, title: '', content: '', tags: [] });
      loadNotes();
    } catch (error: unknown) {
      console.error('Error saving note:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!confirm('Delete this note?')) return;

    const { error } = await supabase
      .from('candidate_notes')
      .delete()
      .eq('id', noteId);

    if (error) {
      toast.error('Failed to delete note');
      return;
    }

    toast.success('Note deleted');
    loadNotes();
  };

  const togglePin = async (noteId: string, currentPinned: boolean) => {
    const { error } = await supabase
      .from('candidate_notes')
      .update({ pinned: !currentPinned })
      .eq('id', noteId);

    if (error) {
      toast.error('Failed to update note');
      return;
    }

    loadNotes();
  };

  const getNoteIcon = (type: string) => {
    switch (type) {
      case 'tqc_internal': return Lock;
      case 'partner_shared': return Users;
      case 'general': return Globe;
      default: return Lock;
    }
  };

  const canEdit = (note: Note) => {
    if (note.note_type === 'tqc_internal') {
      return ['admin', 'strategist'].includes(userRole);
    }
    return true;
  };

  if (loading) {
    return <div>Loading notes...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add Note
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Note Type</label>
              <Select 
                value={newNote.type}
                onValueChange={(v) => setNewNote(prev => ({ ...prev, type: v as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['admin', 'strategist'].includes(userRole) && (
                    <SelectItem value="tqc_internal">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-amber-500" />
                        <div>
                          <div className="font-medium">TQC Internal</div>
                          <div className="text-xs text-muted-foreground">Visible only to TQC team</div>
                        </div>
                      </div>
                    </SelectItem>
                  )}
                  <SelectItem value="partner_shared">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-500" />
                      <div>
                        <div className="font-medium">
                          {userRole === 'partner' ? 'Shared with TQC' : 'Partner Shared'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {userRole === 'partner' 
                            ? 'Visible to you, your team, and TQC' 
                            : 'Visible to partner company and TQC'}
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="general">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-green-500" />
                      <div>
                        <div className="font-medium">General</div>
                        <div className="text-xs text-muted-foreground">Visible to everyone</div>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Title (Optional)</label>
              <Input
                placeholder="Note title..."
                value={newNote.title}
                onChange={(e) => setNewNote(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Content
            </label>
            <Textarea
              value={newNote.content}
              onChange={(e) => setNewNote(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Add your notes here..."
              rows={4}
              disabled={saving}
            />
          </div>

            <Button onClick={handleSave} className="w-full" disabled={saving || !user}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Note'}
            </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Notes</TabsTrigger>
          {['admin', 'strategist'].includes(userRole) && (
            <TabsTrigger value="tqc_internal">TQC Internal</TabsTrigger>
          )}
          <TabsTrigger value="partner_shared">Partner Shared</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-3 mt-4">
          {notes.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No notes yet
              </CardContent>
            </Card>
          ) : (
            notes.map(note => {
              const Icon = getNoteIcon(note.note_type);
              const noteColor = note.note_type === 'tqc_internal' 
                ? 'border-amber-500/30 bg-amber-500/5' 
                : note.note_type === 'partner_shared'
                ? 'border-blue-500/30 bg-blue-500/5'
                : 'border-green-500/30 bg-green-500/5';
              return (
                <Card key={note.id} id={`note-${note.id}`} className={`${note.pinned ? 'border-primary' : ''} ${noteColor}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={
                          note.note_type === 'tqc_internal' 
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                            : note.note_type === 'partner_shared'
                            ? 'bg-blue-500/10 text-blue-500 border-blue-500/30'
                            : 'bg-green-500/10 text-green-500 border-green-500/30'
                        }>
                          <Icon className="w-3 h-3 mr-1" />
                          {note.note_type === 'tqc_internal' ? 'TQC Internal' :
                           note.note_type === 'partner_shared' ? 'Partner Shared' : 'General'}
                        </Badge>
                        {note.pinned && (
                          <Badge variant="outline">
                            <Pin className="w-3 h-3 mr-1" />
                            Pinned
                          </Badge>
                        )}
                      </div>
                      
                      {canEdit(note) && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => togglePin(note.id, note.pinned)}
                          >
                            <Pin className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(note.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {note.title && (
                      <h4 className="font-semibold mb-2">{note.title}</h4>
                    )}
                    
                    <div className="text-sm whitespace-pre-wrap text-muted-foreground mb-3">
                      {note.content.replace(/@\[([a-f0-9-]{36})\]\(([^)]+)\)/g, '@$2')}
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        By {note.profiles?.full_name || 'Unknown'} • {format(new Date(note.created_at), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {['tqc_internal', 'partner_shared', 'general'].map(type => (
          <TabsContent key={type} value={type} className="space-y-3 mt-4">
            {notes
              .filter(n => n.note_type === type)
              .map(note => {
                const Icon = getNoteIcon(note.note_type);
              return (
                <Card key={note.id} id={`note-${note.id}`}>
                  <CardContent className="pt-6">
                      <div className="text-sm whitespace-pre-wrap">
                        {note.content.replace(/@\[([a-f0-9-]{36})\]\(([^)]+)\)/g, '@$2')}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(note.created_at), 'MMM d, yyyy')}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
