import { Card } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { useTimeTracking } from "@/hooks/useTimeTracking";

export function PendingApprovals() {
  const { pendingApprovals, isLoading } = useTimeTracking();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Since the status column doesn't exist in the current schema,
  // show a placeholder message
  return (
    <Card className="p-12 text-center border border-border/50">
      <CheckCircle className="h-12 w-12 mx-auto text-green-500/50 mb-4" />
      <h3 className="text-lg font-medium text-foreground mb-2">
        All caught up!
      </h3>
      <p className="text-sm text-muted-foreground">
        No time entries pending approval. The approval workflow will be available once the database is updated.
      </p>
    </Card>
  );
}
