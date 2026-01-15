import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mail, X, Download } from "lucide-react";

interface BulkActionsToolbarProps {
  selectedCount: number;
  strategists: any[];
  onAssignStrategist: (strategistId: string) => void;
  onSendInvitations: () => void;
  onExportSelected: () => void;
  onClearSelection: () => void;
}

export function BulkActionsToolbar({
  selectedCount,
  strategists,
  onAssignStrategist,
  onSendInvitations,
  onExportSelected,
  onClearSelection,
}: BulkActionsToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-background border shadow-lg rounded-lg p-4 flex items-center gap-4">
        <Badge variant="secondary" className="text-base px-3 py-1">
          {selectedCount} selected
        </Badge>
        
        <div className="h-6 w-px bg-border" />
        
        <div className="flex items-center gap-2">
          <Select onValueChange={onAssignStrategist}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Assign Strategist" />
            </SelectTrigger>
            <SelectContent>
              {strategists.map((strategist) => (
                <SelectItem key={strategist.id} value={strategist.id}>
                  {strategist.full_name || strategist.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={onSendInvitations} variant="outline" size="sm">
            <Mail className="w-4 h-4 mr-2" />
            Send Invitations
          </Button>

          <Button onClick={onExportSelected} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>

        <div className="h-6 w-px bg-border" />

        <Button onClick={onClearSelection} variant="ghost" size="sm">
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
