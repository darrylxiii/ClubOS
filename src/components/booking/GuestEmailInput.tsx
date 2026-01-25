import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, UserPlus, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export interface GuestWithPermissions {
  name?: string;
  email: string;
  can_cancel?: boolean;
  can_reschedule?: boolean;
  can_propose_times?: boolean;
  can_add_attendees?: boolean;
}

interface GuestEmailInputProps {
  guests: GuestWithPermissions[];
  onChange: (guests: GuestWithPermissions[]) => void;
  maxGuests?: number;
  /** Host-level permissions - determines what can be delegated */
  allowedPermissions?: {
    can_cancel: boolean;
    can_reschedule: boolean;
    can_propose_times: boolean;
    can_add_attendees: boolean;
  };
  /** Whether to show permission toggles for each guest */
  showPermissions?: boolean;
}

export function GuestEmailInput({ 
  guests, 
  onChange, 
  maxGuests = 10,
  allowedPermissions,
  showPermissions = false,
}: GuestEmailInputProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [expandedGuest, setExpandedGuest] = useState<number | null>(null);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleAddGuest = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setError("");

    if (!email.trim()) {
      setError("Please enter an email address");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    if (guests.some(g => g.email.toLowerCase() === email.toLowerCase())) {
      setError("This email has already been added");
      return;
    }

    if (guests.length >= maxGuests) {
      setError(`Maximum ${maxGuests} guests allowed`);
      return;
    }

    // Default permissions based on what's allowed
    const newGuest: GuestWithPermissions = { 
      email: email.trim(),
      can_cancel: false,
      can_reschedule: false,
      can_propose_times: allowedPermissions?.can_propose_times ?? true,
      can_add_attendees: false,
    };
    
    onChange([...guests, newGuest]);
    setEmail("");
  };

  const handleRemoveGuest = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(guests.filter((_, i) => i !== index));
    if (expandedGuest === index) {
      setExpandedGuest(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      handleAddGuest();
    }
  };

  const handlePermissionChange = (index: number, permission: keyof GuestWithPermissions, value: boolean) => {
    const updatedGuests = [...guests];
    updatedGuests[index] = {
      ...updatedGuests[index],
      [permission]: value,
    };
    onChange(updatedGuests);
  };

  const toggleGuestExpanded = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedGuest(expandedGuest === index ? null : index);
  };

  // Check if any permission can be delegated
  const hasAnyDelegatablePermission = allowedPermissions && (
    allowedPermissions.can_cancel ||
    allowedPermissions.can_reschedule ||
    allowedPermissions.can_propose_times ||
    allowedPermissions.can_add_attendees
  );

  const permissionLabels: Record<string, string> = {
    can_propose_times: 'Propose times',
    can_cancel: 'Cancel meeting',
    can_reschedule: 'Reschedule',
    can_add_attendees: 'Add attendees',
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
            onKeyDown={handleKeyDown}
            placeholder="colleague@example.com"
            className={error ? "border-destructive" : ""}
          />
          {error && (
            <p className="text-xs text-destructive mt-1">{error}</p>
          )}
        </div>
        <Button
          type="button"
          onClick={(e) => handleAddGuest(e)}
          variant="outline"
          size="icon"
          disabled={guests.length >= maxGuests}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {guests.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <UserPlus className="h-3 w-3" />
            <span>{guests.length} additional {guests.length === 1 ? 'guest' : 'guests'}</span>
          </div>
          <div className="space-y-2">
            {guests.map((guest, index) => (
              <div key={index} className="border rounded-lg p-2 bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-sm truncate">{guest.email}</span>
                    {showPermissions && hasAnyDelegatablePermission && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => toggleGuestExpanded(e, index)}
                        className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <ChevronDown className={`h-3 w-3 transition-transform ${expandedGuest === index ? 'rotate-180' : ''}`} />
                        <span className="ml-1">Permissions</span>
                      </Button>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleRemoveGuest(e, index)}
                    className="h-6 w-6 p-0 hover:bg-destructive/10"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                
                {/* Permission toggles - expandable per guest */}
                {showPermissions && hasAnyDelegatablePermission && expandedGuest === index && (
                  <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                    <p className="text-xs text-muted-foreground mb-2">
                      What can this guest do?
                    </p>
                    {Object.entries(permissionLabels).map(([key, label]) => {
                      const permKey = key as keyof typeof allowedPermissions;
                      const isAllowed = allowedPermissions?.[permKey] ?? false;
                      
                      if (!isAllowed) return null;
                      
                      return (
                        <div key={key} className="flex items-center justify-between">
                          <Label 
                            htmlFor={`guest-${index}-${key}`} 
                            className="text-xs font-normal cursor-pointer"
                          >
                            {label}
                          </Label>
                          <Switch
                            id={`guest-${index}-${key}`}
                            checked={guest[key as keyof GuestWithPermissions] as boolean ?? false}
                            onCheckedChange={(checked) => 
                              handlePermissionChange(index, key as keyof GuestWithPermissions, checked)
                            }
                            className="scale-75"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
