import { useState } from 'react';
import { useTaskBoard } from '@/contexts/TaskBoardContext';
import { useAuth } from '@/contexts/AuthContext';
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
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { BoardVisibility } from '@/types/taskBoard';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const ICON_OPTIONS = ['📋', '✨', '🎯', '🚀', '💼', '📊', '🔥', '⭐', '🎨', '🏆'];

interface CreateBoardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateBoardDialog({ open, onOpenChange }: CreateBoardDialogProps) {
  const { user } = useAuth();
  const { createBoard } = useTaskBoard();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<BoardVisibility>('personal');
  const [selectedIcon, setSelectedIcon] = useState('📋');
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');

  // Check if user is admin of any companies
  useState(() => {
    if (user) {
      supabase
        .from('company_members')
        .select('company_id, companies(id, name)')
        .eq('user_id', user.id)
        .in('role', ['owner', 'admin'])
        .then(({ data }) => {
          if (data) {
            setCompanies(data.map(cm => cm.companies).filter(Boolean));
          }
        });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter a board name');
      return;
    }

    if (visibility === 'company' && !selectedCompanyId) {
      toast.error('Please select a company');
      return;
    }

    setIsSubmitting(true);
    try {
      await createBoard({
        name: name.trim(),
        description: description.trim() || null,
        visibility,
        icon: selectedIcon,
        company_id: visibility === 'company' ? selectedCompanyId : null,
      });

      // Reset form
      setName('');
      setDescription('');
      setVisibility('personal');
      setSelectedIcon('📋');
      setSelectedCompanyId('');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create board:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Board</DialogTitle>
          <DialogDescription>
            Create a personal, shared, or company-wide task board
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Board Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Q4 Product Launch"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this board for?"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="flex gap-2 flex-wrap">
              {ICON_OPTIONS.map((icon) => (
                <Button
                  key={icon}
                  type="button"
                  variant={selectedIcon === icon ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedIcon(icon)}
                  className="text-lg"
                >
                  {icon}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Visibility</Label>
            <RadioGroup value={visibility} onValueChange={(v) => setVisibility(v as BoardVisibility)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="personal" id="personal" />
                <Label htmlFor="personal" className="font-normal cursor-pointer">
                  Personal - Only you can access
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="shared" id="shared" />
                <Label htmlFor="shared" className="font-normal cursor-pointer">
                  Shared - Invite specific people
                </Label>
              </div>
              {companies.length > 0 && (
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="company" id="company" />
                  <Label htmlFor="company" className="font-normal cursor-pointer">
                    Company - All company members
                  </Label>
                </div>
              )}
            </RadioGroup>
          </div>

          {visibility === 'company' && companies.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="company">Select Company</Label>
              <select
                id="company"
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="w-full px-3 py-2 border border-input bg-background rounded-md"
                required
              >
                <option value="">Choose a company...</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Board'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
