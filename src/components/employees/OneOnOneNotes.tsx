import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOneOnOneNotes, useCreateOneOnOneNote } from "@/hooks/usePerformanceReviews";
import { useAllEmployees } from "@/hooks/useEmployeeProfile";
import { toast } from "sonner";
import { format } from "date-fns";
import { 
  MessageSquare, 
  Plus, 
  Loader2,
  Calendar,
  ListTodo,
  FileText
} from "lucide-react";

export function OneOnOneNotes() {
  const { data: notes, isLoading } = useOneOnOneNotes();
  const { data: employees } = useAllEmployees();
  const createNote = useCreateOneOnOneNote();
  
  const [isOpen, setIsOpen] = useState(false);
  const [newNote, setNewNote] = useState({
    employee_id: '',
    meeting_date: format(new Date(), 'yyyy-MM-dd'),
    agenda: '',
    discussion_notes: '',
    action_items: '',
  });

  const handleCreate = async () => {
    if (!newNote.employee_id) {
      toast.error('Please select an employee');
      return;
    }
    try {
      await createNote.mutateAsync(newNote);
      setIsOpen(false);
      setNewNote({
        employee_id: '',
        meeting_date: format(new Date(), 'yyyy-MM-dd'),
        agenda: '',
        discussion_notes: '',
        action_items: '',
      });
      toast.success('1:1 notes saved');
    } catch (error) {
      toast.error('Failed to save notes');
    }
  };

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              1:1 Meeting Notes
            </CardTitle>
            <CardDescription>
              Track one-on-one discussions and action items
            </CardDescription>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New 1:1
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Record 1:1 Meeting</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Employee</Label>
                    <Select
                      value={newNote.employee_id}
                      onValueChange={(v) => setNewNote(prev => ({ ...prev, employee_id: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees?.map(emp => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.profile?.full_name || 'Employee'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Meeting Date</Label>
                    <Input
                      type="date"
                      value={newNote.meeting_date}
                      onChange={(e) => setNewNote(prev => ({ ...prev, meeting_date: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <ListTodo className="h-4 w-4" />
                    Agenda
                  </Label>
                  <Textarea
                    value={newNote.agenda}
                    onChange={(e) => setNewNote(prev => ({ ...prev, agenda: e.target.value }))}
                    placeholder="Topics to discuss..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Discussion Notes
                  </Label>
                  <Textarea
                    value={newNote.discussion_notes}
                    onChange={(e) => setNewNote(prev => ({ ...prev, discussion_notes: e.target.value }))}
                    placeholder="Key points discussed..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Action Items
                  </Label>
                  <Textarea
                    value={newNote.action_items}
                    onChange={(e) => setNewNote(prev => ({ ...prev, action_items: e.target.value }))}
                    placeholder="Follow-up actions and owners..."
                    rows={3}
                  />
                </div>

                <Button 
                  onClick={handleCreate} 
                  className="w-full"
                  disabled={createNote.isPending}
                >
                  {createNote.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Save Notes
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !notes?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No 1:1 notes yet</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {notes.map(note => (
              <div 
                key={note.id}
                className="p-4 bg-muted/30 rounded-lg space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {format(new Date(note.meeting_date), 'MMMM d, yyyy')}
                  </span>
                </div>
                {note.agenda && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Agenda</p>
                    <p className="text-sm">{note.agenda}</p>
                  </div>
                )}
                {note.discussion_notes && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Discussion</p>
                    <p className="text-sm line-clamp-3">{note.discussion_notes}</p>
                  </div>
                )}
                {note.action_items && (
                  <div className="pt-2 border-t border-border/50">
                    <p className="text-xs text-muted-foreground mb-1">Action Items</p>
                    <p className="text-sm">{note.action_items}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
