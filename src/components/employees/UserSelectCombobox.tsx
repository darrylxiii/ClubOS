import { useState } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
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
  value?: AvailableUser | null;
  onChange: (user: AvailableUser | null) => void;
  disabled?: boolean;
  placeholder?: string;
  companyId?: string | null;
}

export const UserSelectCombobox = ({ 
  value, 
  onChange, 
  disabled, 
  placeholder,
  companyId 
}: UserSelectComboboxProps) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  
  // Pass companyId to filter users by company - use null if not provided to get all users
  const { data: users, isLoading, error } = useAvailableUsers(true, companyId ?? null);

  const selectedUser = value;

  const getRoleBadgeVariant = (role: string | null) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'strategist': return 'default';
      case 'partner': return 'secondary';
      default: return 'outline';
    }
  };

  // Filter users based on search
  const filteredUsers = users?.filter(user => {
    if (!searchValue) return true;
    const searchLower = searchValue.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.current_title?.toLowerCase().includes(searchLower)
    );
  });

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
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading users...</span>
            </div>
          ) : selectedUser ? (
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
            <span className="text-muted-foreground">{placeholder || "Select a user..."}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Search users..." 
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="py-6 text-center text-sm text-destructive">
                Error loading users. Please try again.
              </div>
            ) : filteredUsers?.length === 0 ? (
              <CommandEmpty>
                {searchValue 
                  ? `No users found matching "${searchValue}"` 
                  : companyId 
                    ? "No available users in this company." 
                    : "No users found."}
              </CommandEmpty>
            ) : (
              <CommandGroup heading={`${filteredUsers?.length || 0} users available`}>
                {filteredUsers?.map((user) => (
                  <CommandItem
                    key={user.id}
                    value={user.id}
                    onSelect={() => {
                      onChange(user.id === value?.id ? null : user);
                      setOpen(false);
                      setSearchValue("");
                    }}
                    className="flex items-center gap-3 py-3 cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "h-4 w-4 flex-shrink-0",
                        value?.id === user.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback>
                        {user.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="font-medium truncate">{user.full_name || 'Unknown'}</span>
                      <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                      {user.current_title && (
                        <span className="text-xs text-muted-foreground truncate">{user.current_title}</span>
                      )}
                    </div>
                    {user.role && (
                      <Badge variant={getRoleBadgeVariant(user.role)} className="ml-auto flex-shrink-0">
                        {user.role}
                      </Badge>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
