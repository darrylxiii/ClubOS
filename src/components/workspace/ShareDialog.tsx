import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Switch } from '@/components/ui/switch';
import { WorkspacePage } from '@/hooks/useWorkspacePages';
import { Copy, Check, Globe, Lock, Users } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page: WorkspacePage;
  onUpdate: (updates: Partial<WorkspacePage>) => void;
}

export function ShareDialog({ open, onOpenChange, page, onUpdate }: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  
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
    // TODO: Implement invite functionality
    toast.success(`Invitation sent to ${inviteEmail}`);
    setInviteEmail('');
  };

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

  const currentVisibility = visibilityConfig[page.visibility || 'private'];
  const VisibilityIcon = currentVisibility.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-xl">{page.icon_emoji || '📄'}</span>
            Share "{page.title || 'Untitled'}"
          </DialogTitle>
          <DialogDescription>
            Control who can access this page and copy the link.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Visibility Setting */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Page Access</Label>
            <div className="grid gap-2">
              {(['private', 'shared', 'public'] as const).map((visibility) => {
                const config = visibilityConfig[visibility];
                const Icon = config.icon;
                const isSelected = page.visibility === visibility || 
                                  (!page.visibility && visibility === 'private');
                
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

          {/* Invite by Email - Only show for shared visibility */}
          {page.visibility === 'shared' && (
            <div className="space-y-3">
              <Label htmlFor="invite-email" className="text-sm font-medium">
                Invite by email
              </Label>
              <div className="flex gap-2">
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="email@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                />
                <Button onClick={handleInvite} disabled={!inviteEmail.trim()}>
                  Invite
                </Button>
              </div>
            </div>
          )}

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
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
