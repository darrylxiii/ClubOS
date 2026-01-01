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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DeleteCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  companyName: string;
  onSuccess: () => void;
}

export function DeleteCompanyDialog({
  open,
  onOpenChange,
  companyId,
  companyName,
  onSuccess,
}: DeleteCompanyDialogProps) {
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);

  const isConfirmed = confirmation === companyName;

  const handleDelete = async () => {
    if (!isConfirmed) return;

    setLoading(true);
    try {
      // Delete company members first
      await supabase
        .from("company_members")
        .delete()
        .eq("company_id", companyId);

      // Delete the company
      const { error } = await supabase
        .from("companies")
        .delete()
        .eq("id", companyId);

      if (error) throw error;

      toast.success(`${companyName} has been permanently deleted`);
      onSuccess();
      onOpenChange(false);
      setConfirmation("");
    } catch (error) {
      console.error("Error deleting company:", error);
      toast.error("Failed to delete company. There may be related records that need to be removed first.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete {companyName}?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="text-sm text-destructive">
                  <strong>This action cannot be undone.</strong> All company data, jobs, 
                  applications, and member associations will be permanently deleted.
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Consider archiving the company instead if you may need to access this data later.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-4">
          <Label htmlFor="confirm-name">
            Type <span className="font-mono font-semibold">{companyName}</span> to confirm
          </Label>
          <Input
            id="confirm-name"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder="Enter company name"
          />
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleDelete} 
            disabled={loading || !isConfirmed}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Delete Permanently
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
