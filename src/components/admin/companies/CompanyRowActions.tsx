import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  Pencil,
  DollarSign,
  Users,
  Ban,
  CheckCircle,
  Archive,
  ArchiveRestore,
  Trash2,
  ExternalLink,
  UserCog,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import { StrategistAssignmentDialog } from "./StrategistAssignmentDialog";

interface Company {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  archived_at: string | null;
}

interface CompanyRowActionsProps {
  company: Company;
  onEdit: () => void;
  onConfigureFees: () => void;
  onManageMembers: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onRefresh: () => void;
}

export function CompanyRowActions({
  company,
  onEdit,
  onConfigureFees,
  onManageMembers,
  onArchive,
  onDelete,
  onRefresh,
}: CompanyRowActionsProps) {
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [strategistDialogOpen, setStrategistDialogOpen] = useState(false);

  const isArchived = !!company.archived_at;

  const handleToggleStatus = async () => {
    try {
      const { error } = await supabase
        .from("companies")
        .update({ is_active: !company.is_active })
        .eq("id", company.id);

      if (error) throw error;

      toast.success(
        company.is_active
          ? `${company.name} has been suspended`
          : `${company.name} has been activated`
      );
      onRefresh();
    } catch (error) {
      console.error("Error toggling company status:", error);
      toast.error("Failed to update company status");
    }
  };

  const handleRestore = async () => {
    try {
      const { error } = await supabase
        .from("companies")
        .update({
          archived_at: null,
          archived_by: null,
          archive_reason: null,
          is_active: true,
        })
        .eq("id", company.id);

      if (error) throw error;

      toast.success(`${company.name} has been restored`);
      onRefresh();
    } catch (error) {
      console.error("Error restoring company:", error);
      toast.error("Failed to restore company");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => window.open(`/company/${company.slug}`, "_blank")}>
            <ExternalLink className="h-4 w-4 mr-2" />
            View Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onConfigureFees}>
            <DollarSign className="h-4 w-4 mr-2" />
            Configure Fees
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onManageMembers}>
            <Users className="h-4 w-4 mr-2" />
            Manage Members
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setStrategistDialogOpen(true)}>
            <UserCog className="h-4 w-4 mr-2" />
            Assign Strategist
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {isArchived ? (
            <DropdownMenuItem onClick={() => setRestoreDialogOpen(true)}>
              <ArchiveRestore className="h-4 w-4 mr-2" />
              Restore Company
            </DropdownMenuItem>
          ) : (
            <>
              <DropdownMenuItem onClick={() => setSuspendDialogOpen(true)}>
                {company.is_active ? (
                  <>
                    <Ban className="h-4 w-4 mr-2" />
                    Suspend
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Activate
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onArchive}>
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </DropdownMenuItem>
            </>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem 
            onClick={onDelete}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={suspendDialogOpen}
        onOpenChange={setSuspendDialogOpen}
        title={company.is_active ? "Suspend Company?" : "Activate Company?"}
        description={
          company.is_active
            ? `Suspending ${company.name} will prevent members from accessing the company portal and hide active jobs from candidates.`
            : `Activating ${company.name} will restore access for members and make jobs visible again.`
        }
        confirmText={company.is_active ? "Suspend" : "Activate"}
        onConfirm={handleToggleStatus}
        variant={company.is_active ? "destructive" : "default"}
      />

      <ConfirmDialog
        open={restoreDialogOpen}
        onOpenChange={setRestoreDialogOpen}
        title="Restore Company?"
        description={`This will restore ${company.name} from the archive and make it active again.`}
        confirmText="Restore"
        onConfirm={handleRestore}
      />

      <StrategistAssignmentDialog
        open={strategistDialogOpen}
        onOpenChange={setStrategistDialogOpen}
        company={{ id: company.id, name: company.name }}
      />
    </>
  );
}
