import { useState, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Save, X, Lock, History } from 'lucide-react';
import { useEditLock } from '@/hooks/useEditLock';
import { toast } from 'sonner';

interface EditableSectionProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  candidateId: string;
  sectionName: string;
  canEdit: boolean;
  requiresApproval?: boolean;
  children: ReactNode;
  editComponent?: ReactNode;
  onSave?: (data: any) => Promise<void>;
  onCancel?: () => void;
  onViewHistory?: () => void;
  className?: string;
}

export function EditableSection({
  title,
  icon: Icon,
  candidateId,
  sectionName,
  canEdit,
  requiresApproval = false,
  children,
  editComponent,
  onSave,
  onCancel,
  onViewHistory,
  className,
}: EditableSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { isLocked, lockedBy, hasLock, acquireLock, releaseLock } = useEditLock(
    candidateId,
    sectionName
  );

  const handleEditClick = async () => {
    if (isLocked && !hasLock) {
      toast.error(`This section is being edited by ${lockedBy}`);
      return;
    }

    const acquired = await acquireLock();
    if (acquired) {
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (!onSave) return;

    setIsSaving(true);
    try {
      await onSave({});
      await releaseLock();
      setIsEditing(false);
      
      if (requiresApproval) {
        toast.success('Changes submitted for approval');
      } else {
        toast.success('Changes saved successfully');
      }
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = async () => {
    await releaseLock();
    setIsEditing(false);
    onCancel?.();
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Icon className="w-5 h-5" />
            {title}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {/* Lock indicator */}
            {isLocked && !hasLock && (
              <Badge variant="outline" className="gap-1">
                <Lock className="w-3 h-3" />
                Editing by {lockedBy}
              </Badge>
            )}

            {/* Approval required badge */}
            {requiresApproval && isEditing && (
              <Badge variant="secondary">Requires Approval</Badge>
            )}

            {/* History button */}
            {onViewHistory && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onViewHistory}
                className="h-8 w-8 p-0"
              >
                <History className="w-4 h-4" />
              </Button>
            )}

            {/* Edit toggle */}
            {canEdit && !isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEditClick}
                disabled={isLocked && !hasLock}
                className="gap-1"
              >
                <Pencil className="w-3 h-3" />
                Edit
              </Button>
            )}

            {/* Save/Cancel buttons */}
            {isEditing && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="gap-1"
                >
                  <X className="w-3 h-3" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="gap-1"
                >
                  <Save className="w-3 h-3" />
                  {isSaving ? 'Saving...' : requiresApproval ? 'Submit' : 'Save'}
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isEditing && editComponent ? editComponent : children}
      </CardContent>
    </Card>
  );
}
