import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:bg-black/80 group-[.toaster]:backdrop-blur-3xl group-[.toaster]:text-white group-[.toaster]:border-[0.5px] group-[.toaster]:border-white/10 group-[.toaster]:shadow-[0_16px_40px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.15)] group-[.toaster]:rounded-full items-center px-4 py-3 gap-3 mx-auto mt-4",
          title: "text-[13px] font-semibold tracking-tight text-white",
          description: "group-[.toast]:text-white/70 text-[11px] font-medium tracking-wide",
          actionButton: "group-[.toast]:bg-white/10 group-[.toast]:text-white group-[.toast]:border-0 group-[.toast]:hover:bg-white/20 group-[.toast]:rounded-full group-[.toast]:font-bold group-[.toast]:text-[10px] group-[.toast]:tracking-[0.1em] group-[.toast]:uppercase px-4 py-1.5 transition-colors",
          cancelButton: "group-[.toast]:bg-transparent group-[.toast]:text-white/50 group-[.toast]:border-0 group-[.toast]:hover:bg-white/5 group-[.toast]:rounded-full group-[.toast]:font-semibold group-[.toast]:text-[10px] px-4 py-1.5 transition-colors",
          success: "group-[.toaster]:bg-emerald-950/90 group-[.toaster]:border-emerald-500/40 group-[.toaster]:shadow-[0_16px_40px_rgba(16,185,129,0.25),inset_0_1px_1px_rgba(255,255,255,0.2)]",
          error: "group-[.toaster]:bg-red-950/90 group-[.toaster]:border-red-500/40 group-[.toaster]:shadow-[0_16px_40px_rgba(239,68,68,0.25),inset_0_1px_1px_rgba(255,255,255,0.2)]",
          warning: "group-[.toaster]:bg-amber-950/90 group-[.toaster]:border-amber-500/40 group-[.toaster]:shadow-[0_16px_40px_rgba(245,158,11,0.25),inset_0_1px_1px_rgba(255,255,255,0.2)]",
          info: "group-[.toaster]:bg-blue-950/90 group-[.toaster]:border-blue-500/40 group-[.toaster]:shadow-[0_16px_40px_rgba(59,130,246,0.25),inset_0_1px_1px_rgba(255,255,255,0.2)]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
