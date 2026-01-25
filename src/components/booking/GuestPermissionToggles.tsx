import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Shield } from "lucide-react";
import { useState } from "react";

export interface GuestPermissions {
  can_cancel: boolean;
  can_reschedule: boolean;
  can_propose_times: boolean;
  can_add_attendees: boolean;
}

interface GuestPermissionTogglesProps {
  permissions: GuestPermissions;
  onChange: (permissions: GuestPermissions) => void;
  /** Host-level limits - guests cannot have permissions beyond these */
  allowedPermissions?: GuestPermissions;
  /** Whether this is for host configuration or booker delegation */
  mode?: 'host' | 'booker';
  disabled?: boolean;
}

export function GuestPermissionToggles({
  permissions,
  onChange,
  allowedPermissions,
  mode = 'booker',
  disabled = false,
}: GuestPermissionTogglesProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = (key: keyof GuestPermissions, value: boolean) => {
    // If in booker mode, cap by allowed permissions
    if (mode === 'booker' && allowedPermissions && value) {
      if (!allowedPermissions[key]) {
        return; // Host doesn't allow this permission
      }
    }
    onChange({ ...permissions, [key]: value });
  };

  const isPermissionAllowed = (key: keyof GuestPermissions): boolean => {
    if (mode === 'host') return true;
    return allowedPermissions ? allowedPermissions[key] : true;
  };

  const permissionItems = [
    {
      key: 'can_propose_times' as const,
      label: 'Propose alternative times',
      description: mode === 'host' 
        ? 'Allow guests to suggest different meeting times'
        : 'Let this guest suggest a different time',
    },
    {
      key: 'can_cancel' as const,
      label: 'Cancel meeting',
      description: mode === 'host'
        ? 'Allow guests to cancel the booking'
        : 'Let this guest cancel the meeting',
    },
    {
      key: 'can_reschedule' as const,
      label: 'Reschedule meeting',
      description: mode === 'host'
        ? 'Allow guests to reschedule to a different time'
        : 'Let this guest reschedule',
    },
    {
      key: 'can_add_attendees' as const,
      label: 'Add more attendees',
      description: mode === 'host'
        ? 'Allow guests to invite additional people'
        : 'Let this guest invite others',
    },
  ];

  if (mode === 'host') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <h4 className="font-medium text-sm">Guest Permissions</h4>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Control what guests and attendees can do with bookings
        </p>
        
        <div className="space-y-4">
          {permissionItems.map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor={`host-${item.key}`} className="text-sm font-normal">
                  {item.label}
                </Label>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
              <Switch
                id={`host-${item.key}`}
                checked={permissions[item.key]}
                onCheckedChange={(checked) => handleToggle(item.key, checked)}
                disabled={disabled}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Booker mode - collapsible per-guest permissions
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        <span>Guest permissions</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3 space-y-3">
        {permissionItems.map((item) => {
          const allowed = isPermissionAllowed(item.key);
          return (
            <div key={item.key} className="flex items-center justify-between">
              <Label 
                htmlFor={`guest-${item.key}`} 
                className={`text-xs font-normal ${!allowed ? 'text-muted-foreground line-through' : ''}`}
              >
                {item.label}
              </Label>
              <Switch
                id={`guest-${item.key}`}
                checked={permissions[item.key] && allowed}
                onCheckedChange={(checked) => handleToggle(item.key, checked)}
                disabled={disabled || !allowed}
                className="scale-75"
              />
            </div>
          );
        })}
        {allowedPermissions && !Object.values(allowedPermissions).some(Boolean) && (
          <p className="text-xs text-muted-foreground italic">
            The host has disabled all guest permissions for this booking type.
          </p>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
