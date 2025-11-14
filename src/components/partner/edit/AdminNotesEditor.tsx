import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FileText } from 'lucide-react';

interface AdminNotesEditorProps {
  candidate: any;
  onChange?: (data: any) => void;
}

export function AdminNotesEditor({ candidate, onChange }: AdminNotesEditorProps) {
  const [adminNotes, setAdminNotes] = useState(candidate.admin_notes || '');

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
          placeholder="Add internal notes about this candidate (not visible to partners or candidates)"
          rows={10}
          className="resize-none"
        />
        <p className="text-sm text-muted-foreground">
          These notes are for internal use only and will not be shared with the candidate or partners.
        </p>
      </div>
    </div>
  );
}
