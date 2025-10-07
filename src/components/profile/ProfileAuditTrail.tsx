import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  History, 
  Undo, 
  Clock, 
  User,
  ChevronDown,
  ChevronUp 
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ProfileEdit {
  id: string;
  timestamp: Date;
  user: string;
  field: string;
  oldValue: string;
  newValue: string;
  visibility?: string;
}

interface ProfileAuditTrailProps {
  edits: ProfileEdit[];
  onRestore: (editId: string) => void;
}

export function ProfileAuditTrail({ edits, onRestore }: ProfileAuditTrailProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (edits.length === 0) return null;

  return (
    <Card className="border-2 border-foreground glass backdrop-blur-lg">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <div className="p-4 cursor-pointer hover:bg-accent/10 transition-colors flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-accent" />
              <h3 className="font-bold">Edit History</h3>
              <Badge variant="secondary">{edits.length} changes</Badge>
            </div>
            {isOpen ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-2">
            {edits.map((edit) => (
              <div
                key={edit.id}
                className="p-3 glass rounded-lg border border-accent/20 hover:border-accent/40 transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{edit.user}</span>
                    <span className="text-muted-foreground">updated</span>
                    <Badge variant="outline" className="text-xs">
                      {edit.field}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onRestore(edit.id)}
                    className="h-6 gap-1 text-xs"
                  >
                    <Undo className="w-3 h-3" />
                    Restore
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Previous:</p>
                    <p className="p-2 bg-destructive/10 rounded border border-destructive/20 line-through">
                      {edit.oldValue || <em>Empty</em>}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Current:</p>
                    <p className="p-2 bg-accent/10 rounded border border-accent/20">
                      {edit.newValue || <em>Empty</em>}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(edit.timestamp, { addSuffix: true })}
                  </div>
                  {edit.visibility && (
                    <Badge variant="secondary" className="text-xs">
                      {edit.visibility}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
