import { useState, useEffect } from "react";
import { InlineLoadingSkeleton } from "@/components/LoadingSkeletons";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface User {
  id: string;
  full_name: string;
  avatar_url: string | null;
  email: string;
}

interface MentionPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (user: User) => void;
  trigger: React.ReactNode;
}

export function MentionPopover({ open, onOpenChange, onSelect, trigger }: MentionPopoverProps) {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    const fetchUsers = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, email")
        .neq("id", user?.id || "")
        .limit(20);

      if (data) {
        setUsers(data.map((u) => ({
          id: u.id,
          full_name: u.full_name || "Unknown",
          avatar_url: u.avatar_url,
          email: u.email || "",
        })));
      }
      setLoading(false);
    };

    fetchUsers();
  }, [open, user?.id]);

  const filteredUsers = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search users..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {loading ? <InlineLoadingSkeleton /> : "No users found."}
            </CommandEmpty>
            <CommandGroup>
              {filteredUsers.map((u) => (
                <CommandItem
                  key={u.id}
                  value={u.id}
                  onSelect={() => {
                    onSelect(u);
                    onOpenChange(false);
                    setSearch("");
                  }}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={u.avatar_url || undefined} />
                    <AvatarFallback>{u.full_name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
