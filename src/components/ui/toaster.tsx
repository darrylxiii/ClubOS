import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        classNames: {
          toast: "bg-background border-border text-foreground",
          title: "text-foreground font-medium",
          description: "text-muted-foreground",
          success: "bg-background border-border text-foreground",
          error: "bg-background border-destructive text-foreground",
          warning: "bg-background border-yellow-500 text-foreground",
          info: "bg-background border-border text-foreground",
        },
      }}
    />
  );
}
