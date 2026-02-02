import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCreateAssignment } from "@/hooks/useNotificationAssignments";
import { ScrollArea } from "@/components/ui/scroll-area";

interface UserAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notificationTypeId: string;
}

export function UserAssignmentDialog({
  open,
  onOpenChange,
  notificationTypeId,
}: UserAssignmentDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [channel, setChannel] = useState<"email" | "push" | "both">("email");
  const createMutation = useCreateAssignment();

  const { data: users, isLoading } = useQuery({
    queryKey: ["profiles-search", searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("id, full_name, email")
        .order("full_name", { ascending: true })
        .limit(50);

      if (searchQuery) {
        query = query.or(
          `full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const handleSubmit = async () => {
    if (!selectedUserId) return;

    await createMutation.mutateAsync({
      notification_type_id: notificationTypeId,
      assignment_type: "user",
      role: null,
      user_id: selectedUserId,
      is_enabled: true,
      channel,
    });

    onOpenChange(false);
  };

  const selectedUser = users?.find((u) => u.id === selectedUserId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Add User Assignment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Search User</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Select User</Label>
            <ScrollArea className="h-[200px] rounded-md border">
              {isLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Loading users...
                </div>
              ) : users?.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No users found
                </div>
              ) : (
                <div className="p-2">
                  {users?.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => setSelectedUserId(user.id)}
                      className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors ${
                        selectedUserId === user.id
                          ? "bg-primary/20 ring-1 ring-primary"
                          : "hover:bg-muted"
                      }`}
                    >
                      <div className="p-2 rounded-full bg-muted">
                        <User className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {user.full_name || "Unnamed User"}
                        </p>
                        <p
                          className={`text-xs truncate ${
                            selectedUserId === user.id
                              ? "text-foreground/70"
                              : "text-muted-foreground"
                          }`}
                        >
                          {user.email}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {selectedUser && (
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-sm font-medium">Selected:</p>
              <p className="text-sm">{selectedUser.full_name || "Unnamed"}</p>
              <p className="text-xs text-muted-foreground">
                {selectedUser.email}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Notification Channel</Label>
            <Select
              value={channel}
              onValueChange={(value) =>
                setChannel(value as "email" | "push" | "both")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email Only</SelectItem>
                <SelectItem value="push">Push Only</SelectItem>
                <SelectItem value="both">Email & Push</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedUserId || createMutation.isPending}
          >
            {createMutation.isPending ? "Adding..." : "Add Assignment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
