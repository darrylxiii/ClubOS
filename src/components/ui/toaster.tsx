import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        classNames: {
          toast: "group toast group-[.toaster]:bg-black/60 group-[.toaster]:backdrop-blur-2xl group-[.toaster]:text-white group-[.toaster]:border-[0.5px] group-[.toaster]:border-white/10 group-[.toaster]:shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.1)] group-[.toaster]:rounded-full items-center px-4 py-3 gap-3",
          title: "text-[13px] font-semibold tracking-tight text-white",
          description: "group-[.toast]:text-white/70 text-[11px] font-medium tracking-wide",
          actionButton: "group-[.toast]:bg-white/10 group-[.toast]:text-white group-[.toast]:border-0 group-[.toast]:hover:bg-white/20 group-[.toast]:rounded-full group-[.toast]:font-bold group-[.toast]:text-[10px] group-[.toast]:tracking-wider px-3 py-1",
          cancelButton: "group-[.toast]:bg-transparent group-[.toast]:text-white/50 group-[.toast]:border-0 group-[.toast]:hover:bg-white/5 group-[.toast]:rounded-full group-[.toast]:font-semibold group-[.toast]:text-[10px]",
          success: "group-[.toaster]:bg-emerald-950/80 group-[.toaster]:border-emerald-500/30 group-[.toaster]:shadow-[0_8px_32px_rgba(16,185,129,0.2),inset_0_1px_1px_rgba(255,255,255,0.1)]",
          error: "group-[.toaster]:bg-red-950/80 group-[.toaster]:border-red-500/30 group-[.toaster]:shadow-[0_8px_32px_rgba(239,68,68,0.2),inset_0_1px_1px_rgba(255,255,255,0.1)]",
          warning: "group-[.toaster]:bg-amber-950/80 group-[.toaster]:border-amber-500/30 group-[.toaster]:shadow-[0_8px_32px_rgba(245,158,11,0.2),inset_0_1px_1px_rgba(255,255,255,0.1)]",
          info: "group-[.toaster]:bg-blue-950/80 group-[.toaster]:border-blue-500/30 group-[.toaster]:shadow-[0_8px_32px_rgba(59,130,246,0.2),inset_0_1px_1px_rgba(255,255,255,0.1)]",
        },
      }}
    />
  );
}
