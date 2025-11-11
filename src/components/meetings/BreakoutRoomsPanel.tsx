import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Users, ArrowRight, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface BreakoutRoom {
  id: string;
  name: string;
  max_participants: number;
  participant_count: number;
}

interface BreakoutRoomsPanelProps {
  meetingId: string;
  isHost: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BreakoutRoomsPanel({ meetingId, isHost, open, onOpenChange }: BreakoutRoomsPanelProps) {
  const [rooms, setRooms] = useState<BreakoutRoom[]>([]);
  const [newRoomName, setNewRoomName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadRooms();
      
      const channel = supabase
        .channel(`breakout-rooms-${meetingId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'meeting_breakout_rooms',
            filter: `meeting_id=eq.${meetingId}`
          },
          () => loadRooms()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [open, meetingId]);

  const loadRooms = async () => {
    try {
      const { data: roomsData, error } = await supabase
        .from('meeting_breakout_rooms' as any)
        .select(`
          id,
          name,
          max_participants,
          breakout_room_participants(count)
        `)
        .eq('meeting_id', meetingId)
        .eq('is_active', true);

      if (error) throw error;

      const formatted = roomsData?.map((room: any) => ({
        id: room.id,
        name: room.name,
        max_participants: room.max_participants,
        participant_count: (room.breakout_room_participants as any)[0]?.count || 0
      })) || [];

      setRooms(formatted);
    } catch (error) {
      console.error('Error loading rooms:', error);
    }
  };

  const createRoom = async () => {
    if (!newRoomName.trim()) {
      toast.error("Room name is required");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('meeting_breakout_rooms' as any)
        .insert({
          meeting_id: meetingId,
          name: newRoomName,
          max_participants: 10
        });

      if (error) throw error;

      setNewRoomName("");
      toast.success("Breakout room created");
    } catch (error) {
      console.error('Error creating room:', error);
      toast.error("Failed to create room");
    } finally {
      setLoading(false);
    }
  };

  const deleteRoom = async (roomId: string) => {
    try {
      const { error } = await supabase
        .from('meeting_breakout_rooms' as any)
        .update({ is_active: false })
        .eq('id', roomId);

      if (error) throw error;
      toast.success("Room closed");
    } catch (error) {
      console.error('Error deleting room:', error);
      toast.error("Failed to close room");
    }
  };

  const joinRoom = async (roomId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('breakout_room_participants' as any)
        .insert({
          breakout_room_id: roomId,
          participant_id: user.id,
          participant_name: user.user_metadata.full_name || user.email
        });

      if (error) throw error;
      toast.success("Joined breakout room");
    } catch (error: any) {
      if (error.code === '23505') {
        toast.info("You're already in this room");
      } else {
        toast.error("Failed to join room");
      }
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[500px] p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Breakout Rooms
          </SheetTitle>
        </SheetHeader>

        <div className="p-4 space-y-4">
          {isHost && (
            <Card className="p-4 bg-card/50">
              <h3 className="font-semibold mb-3">Create Breakout Room</h3>
              <div className="flex gap-2">
                <Input
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="Room name (e.g., Technical Discussion)"
                  onKeyPress={(e) => e.key === 'Enter' && createRoom()}
                />
                <Button onClick={createRoom} disabled={loading}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Create rooms for group discussions or collaborative exercises
              </p>
            </Card>
          )}

          <div>
            <h3 className="font-semibold mb-3">Active Rooms</h3>
            {rooms.length === 0 ? (
              <Card className="p-8 text-center bg-card/50">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No breakout rooms yet</p>
                {isHost && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Create a room to split participants into smaller groups
                  </p>
                )}
              </Card>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {rooms.map((room) => (
                    <Card key={room.id} className="p-4 bg-card/50 hover:bg-card/70 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">{room.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary">
                              <Users className="w-3 h-3 mr-1" />
                              {room.participant_count}/{room.max_participants}
                            </Badge>
                          </div>
                        </div>
                        {isHost && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteRoom(room.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                      
                      <Button
                        className="w-full"
                        onClick={() => joinRoom(room.id)}
                        disabled={room.participant_count >= room.max_participants}
                      >
                        <ArrowRight className="w-4 h-4 mr-2" />
                        Join Room
                      </Button>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}