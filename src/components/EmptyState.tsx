import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "ghost";
  };
  className?: string;
}

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) => {
  return (
    <Card className={cn("w-full max-w-md mx-auto", className)}>
      <CardContent className="pt-8 pb-8 px-6 flex flex-col items-center text-center space-y-4">
        <div className="rounded-full bg-muted p-4">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
        </div>
        {action && (
          <Button
            onClick={action.onClick}
            variant={action.variant || "default"}
            size="lg"
            className="mt-2"
          >
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
