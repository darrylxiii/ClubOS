import { useState } from 'react';
import { usePagePermissions, PagePermission } from '@/hooks/usePagePermissions';
import { WorkspacePage } from '@/hooks/useWorkspacePages';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Copy, 
  Check, 
  Globe, 
  Lock, 
  Users, 
  UserPlus, 
  X, 
  Mail,
  Eye,
  MessageSquare,
  Pencil,
  Crown,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface EnhancedShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page: WorkspacePage;
  onUpdate: (updates: Partial<WorkspacePage>) => void;
}

const permissionLevels = [
  { value: 'view', label: 'Can view', icon: Eye, description: 'Can only view this page' },
  { value: 'comment', label: 'Can comment', icon: MessageSquare, description: 'Can view and comment' },
  { value: 'edit', label: 'Can edit', icon: Pencil, description: 'Full editing access' },
] as const;

const visibilityConfig = {
  private: {
    icon: Lock,
    label: 'Private',
    description: 'Only you can access this page',
  },
  shared: {
    icon: Users,
    label: 'Shared',
    description: 'Invited people can access this page',
  },
  public: {
    icon: Globe,
    label: 'Public',
    description: 'Anyone with the link can access',
  },
};

export function EnhancedShareDialog({ 
  open, 
  onOpenChange, 
  page, 
  onUpdate 
}: EnhancedShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePermission, setInvitePermission] = useState<'view' | 'comment' | 'edit'>('view');
  
  const { permissions, isLoading, inviteUser, updatePermission, removePermission } = 
    usePagePermissions(page.id);

  const pageUrl = `${window.location.origin}/pages/${page.id}`;

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(pageUrl);
    setCopied(true);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVisibilityChange = (visibility: 'private' | 'shared' | 'public') => {
    onUpdate({ visibility });
    toast.success(
      visibility === 'public' 
        ? 'Page is now public' 
        : visibility === 'shared' 
        ? 'Page is shared with invited users' 
        : 'Page is now private'
    );
  };

  const handleInvite = () => {
    if (!inviteEmail.trim()) return;
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    inviteUser.mutate(
      { email: inviteEmail, permission_level: invitePermission },
      { onSuccess: () => setInviteEmail('') }
    );
  };

  const currentVisibility = page.visibility || 'private';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-xl">{page.icon_emoji || '📄'}</span>
            Share "{page.title || 'Untitled'}"
          </DialogTitle>
          <DialogDescription>
            Manage access and sharing settings for this page.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="people" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="people">
              <Users className="h-4 w-4 mr-2" />
              People
            </TabsTrigger>
            <TabsTrigger value="access">
              <Globe className="h-4 w-4 mr-2" />
              Access
            </TabsTrigger>
          </TabsList>

          <TabsContent value="people" className="space-y-4 mt-4">
            {/* Invite Section */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Invite people</Label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                  className="flex-1"
                />
                <Select
                  value={invitePermission}
                  onValueChange={(v) => setInvitePermission(v as any)}
                >
                  <SelectTrigger className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {permissionLevels.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        <div className="flex items-center gap-2">
                          <level.icon className="h-3 w-3" />
                          {level.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  onClick={handleInvite} 
                  disabled={!inviteEmail.trim() || inviteUser.isPending}
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

            {/* People with Access */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">People with access</Label>
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {/* Owner */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          <Crown className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">You (Owner)</p>
                        <p className="text-xs text-muted-foreground">Full access</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                      Owner
                    </span>
                  </div>

                  {/* Invited People */}
                  {permissions.map((permission) => (
                    <PermissionRow
                      key={permission.id}
                      permission={permission}
                      onUpdate={(level) => 
                        updatePermission.mutate({ 
                          permissionId: permission.id, 
                          permission_level: level 
                        })
                      }
                      onRemove={() => removePermission.mutate(permission.id)}
                    />
                  ))}

                  {permissions.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground">
                      <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No one else has access yet</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="access" className="space-y-4 mt-4">
            {/* Visibility Setting */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Page Access</Label>
              <div className="grid gap-2">
                {(['private', 'shared', 'public'] as const).map((visibility) => {
                  const config = visibilityConfig[visibility];
                  const Icon = config.icon;
                  const isSelected = currentVisibility === visibility;
                  
                  return (
                    <button
                      key={visibility}
                      onClick={() => handleVisibilityChange(visibility)}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border text-left transition-colors",
                        isSelected 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:bg-accent/50"
                      )}
                    >
                      <Icon className={cn(
                        "h-5 w-5 mt-0.5 shrink-0",
                        isSelected ? "text-primary" : "text-muted-foreground"
                      )} />
                      <div className="flex-1">
                        <div className={cn(
                          "font-medium text-sm",
                          isSelected ? "text-primary" : "text-foreground"
                        )}>
                          {config.label}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {config.description}
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Copy Link */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Page Link</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={pageUrl}
                  readOnly
                  className="flex-1 text-sm font-mono bg-muted/50"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={handleCopyLink}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {currentVisibility === 'public' 
                  ? 'Anyone with this link can view this page' 
                  : currentVisibility === 'shared'
                  ? 'Only invited people can access with this link'
                  : 'Only you can access this page'}
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

interface PermissionRowProps {
  permission: PagePermission;
  onUpdate: (level: 'view' | 'comment' | 'edit') => void;
  onRemove: () => void;
}

function PermissionRow({ permission, onUpdate, onRemove }: PermissionRowProps) {
  const displayName = permission.user_name || permission.email || 'Unknown';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const isPending = !permission.accepted_at;

  return (
    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-medium">{displayName}</p>
          <p className="text-xs text-muted-foreground">
            {isPending ? 'Pending invite' : permission.email}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Select
          value={permission.permission_level || 'view'}
          onValueChange={(v) => onUpdate(v as any)}
        >
          <SelectTrigger className="w-[110px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {permissionLevels.map((level) => (
              <SelectItem key={level.value} value={level.value}>
                <div className="flex items-center gap-2">
                  <level.icon className="h-3 w-3" />
                  {level.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
