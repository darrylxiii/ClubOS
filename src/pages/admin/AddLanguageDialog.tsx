import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Plus } from 'lucide-react';

interface AddLanguageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLanguageAdded?: () => void;
}

export function AddLanguageDialog({ open, onOpenChange, onLanguageAdded }: AddLanguageDialogProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    nativeName: '',
    flag: '',
    isRTL: false,
    fontFamily: '',
  });

  const handleAdd = async () => {
    if (!formData.code || !formData.name || !formData.nativeName || !formData.flag) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.code.length !== 2) {
      toast.error('Language code must be 2 characters (e.g., "pt", "it", "ja")');
      return;
    }

    setIsAdding(true);
    try {
      const { data, error } = await supabase.functions.invoke('add-language', {
        body: {
          code: formData.code.toLowerCase(),
          name: formData.name,
          nativeName: formData.nativeName,
          flag: formData.flag,
          isRTL: formData.isRTL,
          fontFamily: formData.fontFamily || undefined,
        },
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success(`Language ${formData.nativeName} added successfully!`);
      
      // Reset form
      setFormData({
        code: '',
        name: '',
        nativeName: '',
        flag: '',
        isRTL: false,
        fontFamily: '',
      });

      onOpenChange(false);
      onLanguageAdded?.();
    } catch (error: unknown) {
      console.error('Error adding language:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add language');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Language</DialogTitle>
          <DialogDescription>
            Add a new language to the system. Translations will be automatically generated for all namespaces.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Language Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="PT"
                maxLength={2}
                className="uppercase"
              />
              <p className="text-xs text-muted-foreground">ISO 639-1 code (2 letters)</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="flag">Flag Emoji *</Label>
              <Input
                id="flag"
                value={formData.flag}
                onChange={(e) => setFormData({ ...formData, flag: e.target.value })}
                placeholder="🇵🇹"
                maxLength={2}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">English Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Portuguese"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nativeName">Native Name *</Label>
            <Input
              id="nativeName"
              value={formData.nativeName}
              onChange={(e) => setFormData({ ...formData, nativeName: e.target.value })}
              placeholder="Português"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fontFamily">Font Family (Optional)</Label>
            <Input
              id="fontFamily"
              value={formData.fontFamily}
              onChange={(e) => setFormData({ ...formData, fontFamily: e.target.value })}
              placeholder='system-ui, "Noto Sans", sans-serif'
            />
            <p className="text-xs text-muted-foreground">For languages that need special fonts</p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="isRTL">Right-to-Left (RTL)</Label>
              <p className="text-xs text-muted-foreground">Enable for Arabic, Hebrew, etc.</p>
            </div>
            <Switch
              id="isRTL"
              checked={formData.isRTL}
              onCheckedChange={(checked) => setFormData({ ...formData, isRTL: checked })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isAdding}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={isAdding}>
            {isAdding ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add Language
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
