import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FileText } from 'lucide-react';
import { useRole } from '@/contexts/RoleContext';

interface AdminNotesEditorProps {
  candidate: any;
  onChange?: (data: any) => void;
}

export function AdminNotesEditor({ candidate, onChange }: AdminNotesEditorProps) {
  const { t } = useTranslation('common');
  const { currentRole } = useRole();
  const [adminNotes, setAdminNotes] = useState(candidate.admin_notes || '');

  if (currentRole !== 'admin' && currentRole !== 'strategist') return null;

  useEffect(() => {
    onChange?.({
      admin_notes: adminNotes,
    });
  }, [adminNotes]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="admin_notes" className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Internal Notes (Admin/Strategist Only)
        </Label>
        <Textarea
          id="admin_notes"
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          placeholder={t("add_internal_notes_about", "Add internal notes about this candidate (not visible to partners or candidates)")}
          rows={10}
          className="resize-none"
        />
        <p className="text-sm text-muted-foreground">{t('adminNotesEditor.theseNotesAreForInternalUseOnlyAndWillNo')}</p>
      </div>
    </div>
  );
}
