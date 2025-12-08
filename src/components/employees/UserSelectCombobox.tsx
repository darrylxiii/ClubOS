import { useState } from "react";
import { Check, ChevronsUpDown, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAvailableUsers, AvailableUser } from "@/hooks/useAvailableUsers";

interface UserSelectComboboxProps {
  value?: string;
  onSelect: (user: AvailableUser | null) => void;
  disabled?: boolean;
}

export const UserSelectCombobox = ({ value, onSelect, disabled }: UserSelectComboboxProps) => {
  const [open, setOpen] = useState(false);
  const { data: users, isLoading } = useAvailableUsers(true);

  const selectedUser = users?.find(u => u.id === value);

  const getRoleBadgeVariant = (role: string | null) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'strategist': return 'default';
      case 'partner': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || isLoading}
          className="w-full justify-between h-auto min-h-10 py-2"
        >
          {selectedUser ? (
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={selectedUser.avatar_url || undefined} />
                <AvatarFallback>
                  {selectedUser.full_name?.charAt(0) || selectedUser.email?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start">
                <span className="font-medium">{selectedUser.full_name || 'Unknown'}</span>
                <span className="text-xs text-muted-foreground">{selectedUser.email}</span>
              </div>
              {selectedUser.role && (
                <Badge variant={getRoleBadgeVariant(selectedUser.role)} className="ml-2">
                  {selectedUser.role}
                </Badge>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">Select a user...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search users..." />
          <CommandList>
            <CommandEmpty>No users found.</CommandEmpty>
            <CommandGroup>
              {users?.map((user) => (
                <CommandItem
                  key={user.id}
                  value={`${user.full_name} ${user.email}`}
                  onSelect={() => {
                    onSelect(user.id === value ? null : user);
                    setOpen(false);
                  }}
                  className="flex items-center gap-3 py-3"
                >
                  <Check
                    className={cn(
                      "h-4 w-4",
                      value === user.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback>
                      {user.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col flex-1">
                    <span className="font-medium">{user.full_name || 'Unknown'}</span>
                    <span className="text-xs text-muted-foreground">{user.email}</span>
                    {user.current_title && (
                      <span className="text-xs text-muted-foreground">{user.current_title}</span>
                    )}
                  </div>
                  {user.role && (
                    <Badge variant={getRoleBadgeVariant(user.role)} className="ml-auto">
                      {user.role}
                    </Badge>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
