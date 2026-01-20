import { useState } from 'react';
import { Flag, Plus, Trash2, Settings, Users, Building, Percent } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { useFeatureFlags, FeatureFlag } from '@/hooks/useFeatureFlags';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';

export function FeatureFlagManager() {
  const { flags, isLoading, createFlag, updateFlag, deleteFlag, toggleFlag } = useFeatureFlags();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
  const [editingFlag, setEditingFlag] = useState<FeatureFlag | null>(null);
  const [formData, setFormData] = useState({
    flag_key: '',
    name: '',
    description: '',
    rollout_percentage: 100,
    target_roles: '',
  });

  const handleCreate = async () => {
    const success = await createFlag({
      flag_key: formData.flag_key.toLowerCase().replace(/\s+/g, '_'),
      name: formData.name,
      description: formData.description,
      rollout_percentage: formData.rollout_percentage,
      target_roles: formData.target_roles.split(',').map(r => r.trim()).filter(Boolean),
    });
    if (success) {
      setShowCreateDialog(false);
      setFormData({ flag_key: '', name: '', description: '', rollout_percentage: 100, target_roles: '' });
    }
  };

  const handleDelete = async (id: string) => {
    await deleteFlag(id);
    setShowDeleteDialog(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5" />
            Feature Flags
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5" />
              Feature Flags
            </CardTitle>
            <CardDescription>
              Control feature rollout and targeting
            </CardDescription>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Flag
          </Button>
        </CardHeader>
        <CardContent>
          {flags.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Flag className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No feature flags configured</p>
              <Button
                variant="link"
                onClick={() => setShowCreateDialog(true)}
                className="mt-2"
              >
                Create your first flag
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {flags.map((flag) => (
                <div
                  key={flag.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card/50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{flag.name}</span>
                      <Badge variant="outline" className="font-mono text-xs">
                        {flag.flag_key}
                      </Badge>
                    </div>
                    {flag.description && (
                      <p className="text-sm text-muted-foreground truncate">
                        {flag.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Percent className="h-3 w-3" />
                        {flag.rollout_percentage}%
                      </span>
                      {flag.target_roles.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {flag.target_roles.join(', ')}
                        </span>
                      )}
                      {flag.target_company_ids.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          {flag.target_company_ids.length} companies
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowDeleteDialog(flag.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                    <Switch
                      checked={flag.enabled}
                      onCheckedChange={(enabled) => toggleFlag(flag.id, enabled)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Feature Flag</DialogTitle>
            <DialogDescription>
              Add a new feature flag to control feature rollout
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Flag Name</Label>
              <Input
                id="name"
                placeholder="New Dashboard Design"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="key">Flag Key</Label>
              <Input
                id="key"
                placeholder="new_dashboard_design"
                value={formData.flag_key}
                onChange={(e) => setFormData({ ...formData, flag_key: e.target.value })}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Used in code to check flag status
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Enables the redesigned dashboard for users"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Rollout Percentage: {formData.rollout_percentage}%</Label>
              <Slider
                value={[formData.rollout_percentage]}
                onValueChange={([value]) => setFormData({ ...formData, rollout_percentage: value })}
                max={100}
                step={5}
              />
              <p className="text-xs text-muted-foreground">
                Percentage of targeted users who will see this feature
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="roles">Target Roles (comma-separated)</Label>
              <Input
                id="roles"
                placeholder="admin, strategist, partner"
                value={formData.target_roles}
                onChange={(e) => setFormData({ ...formData, target_roles: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to target all roles
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!formData.name || !formData.flag_key}>
              Create Flag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!showDeleteDialog} onOpenChange={() => setShowDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Feature Flag?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Code relying on this flag will return false.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => showDeleteDialog && handleDelete(showDeleteDialog)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
