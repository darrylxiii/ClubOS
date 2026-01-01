import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Archive } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ArchiveCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  companyName: string;
  onSuccess: () => void;
}

export function ArchiveCompanyDialog({
  open,
  onOpenChange,
  companyId,
  companyName,
  onSuccess,
}: ArchiveCompanyDialogProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleArchive = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("companies")
        .update({
          archived_at: new Date().toISOString(),
          archived_by: user?.id,
          archive_reason: reason || null,
          is_active: false,
        })
        .eq("id", companyId);

      if (error) throw error;

      toast.success(`${companyName} has been archived`);
      onSuccess();
      onOpenChange(false);
      setReason("");
    } catch (error) {
      console.error("Error archiving company:", error);
      toast.error("Failed to archive company");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-muted-foreground" />
            Archive {companyName}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will hide the company from active lists but preserve all data. 
            Jobs will be hidden and members won't be able to access the company portal.
            You can restore the company later if needed.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-4">
          <Label htmlFor="archive-reason">Reason (optional)</Label>
          <Textarea
            id="archive-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Contract ended, Company requested removal..."
            rows={2}
          />
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleArchive} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Archive Company
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
