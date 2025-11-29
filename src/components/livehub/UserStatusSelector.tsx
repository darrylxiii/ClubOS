import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserStatus, useUserPresenceExtended } from '@/hooks/useUserPresenceExtended';
import { Circle, Moon, MinusCircle, EyeOff, Clock } from 'lucide-react';

const statusConfig = {
  online: {
    label: 'Online',
    icon: Circle,
    color: 'text-green-500',
    description: 'Active and available'
  },
  away: {
    label: 'Away',
    icon: Moon,
    color: 'text-yellow-500',
    description: 'Stepped away from keyboard'
  },
  dnd: {
    label: 'Do Not Disturb',
    icon: MinusCircle,
    color: 'text-red-500',
    description: 'Focused, no notifications'
  },
  invisible: {
    label: 'Invisible',
    icon: EyeOff,
    color: 'text-gray-400',
    description: 'Appear offline to others'
  },
  offline: {
    label: 'Offline',
    icon: Circle,
    color: 'text-gray-400',
    description: 'Not available'
  },
};

export const UserStatusSelector = () => {
  const { presence, updateStatus, updateCustomStatus } = useUserPresenceExtended();
  const [customStatus, setCustomStatus] = useState(presence?.custom_status || '');
  const [customEmoji, setCustomEmoji] = useState(presence?.custom_status_emoji || '');
  const [expiresIn, setExpiresIn] = useState<string>('never');
  const [open, setOpen] = useState(false);

  const currentStatus = presence?.status || 'offline';
  const StatusIcon = statusConfig[currentStatus]?.icon || Circle;

  const handleStatusChange = async (newStatus: UserStatus) => {
    await updateStatus(newStatus);
  };

  const handleSaveCustomStatus = async () => {
    const expiresAt = expiresIn === 'never' 
      ? null 
      : new Date(Date.now() + parseInt(expiresIn) * 60 * 60 * 1000).toISOString();
    
    await updateCustomStatus(
      customStatus || null,
      customEmoji || null,
      expiresAt
    );
    setOpen(false);
  };

  const handleClearCustomStatus = async () => {
    await updateCustomStatus(null, null, null);
    setCustomStatus('');
    setCustomEmoji('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <StatusIcon className={`w-4 h-4 ${statusConfig[currentStatus]?.color}`} />
          <span className="text-sm">{statusConfig[currentStatus]?.label}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set your status</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={currentStatus} onValueChange={handleStatusChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(statusConfig).map(([value, config]) => {
                  const Icon = config.icon;
                  return (
                    <SelectItem key={value} value={value}>
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${config.color}`} />
                        <div>
                          <div className="font-medium">{config.label}</div>
                          <div className="text-xs text-muted-foreground">{config.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Custom Status</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Emoji"
                value={customEmoji}
                onChange={(e) => setCustomEmoji(e.target.value)}
                className="w-20"
                maxLength={2}
              />
              <Input
                placeholder="What's your status?"
                value={customStatus}
                onChange={(e) => setCustomStatus(e.target.value)}
                className="flex-1"
                maxLength={50}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Clear after</Label>
            <Select value={expiresIn} onValueChange={setExpiresIn}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="never">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Never
                  </div>
                </SelectItem>
                <SelectItem value="1">1 hour</SelectItem>
                <SelectItem value="4">4 hours</SelectItem>
                <SelectItem value="8">8 hours</SelectItem>
                <SelectItem value="24">24 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSaveCustomStatus} className="flex-1">
              Save Status
            </Button>
            {presence?.custom_status && (
              <Button onClick={handleClearCustomStatus} variant="outline">
                Clear
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
