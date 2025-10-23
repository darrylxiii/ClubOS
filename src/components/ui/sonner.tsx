import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card/20 group-[.toaster]:backdrop-blur-xl group-[.toaster]:text-foreground group-[.toaster]:border-0 group-[.toaster]:shadow-xl group-[.toaster]:rounded-xl",
          description: "group-[.toast]:text-muted-foreground/80",
          actionButton: "group-[.toast]:bg-primary/10 group-[.toast]:text-primary group-[.toast]:border group-[.toast]:border-primary/30 group-[.toast]:hover:bg-primary/20 group-[.toast]:rounded-lg group-[.toast]:font-semibold group-[.toast]:backdrop-blur-sm",
          cancelButton: "group-[.toast]:bg-background/30 group-[.toast]:text-muted-foreground group-[.toast]:border group-[.toast]:border-border/20 group-[.toast]:hover:bg-background/40 group-[.toast]:rounded-lg group-[.toast]:backdrop-blur-sm",
          success: "group-[.toaster]:bg-success/10 group-[.toaster]:border group-[.toaster]:border-success/30",
          error: "group-[.toaster]:bg-destructive/10 group-[.toaster]:border group-[.toaster]:border-destructive/30",
          warning: "group-[.toaster]:bg-warning/10 group-[.toaster]:border group-[.toaster]:border-warning/30",
          info: "group-[.toaster]:bg-primary/10 group-[.toaster]:border group-[.toaster]:border-primary/30",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
