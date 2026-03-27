import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[12px] text-sm font-semibold ring-offset-background transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98] overflow-hidden relative",
  {
    variants: {
      variant: {
        default: "bg-white/[0.04] dark:bg-white/[0.02] border border-white/10 hover:bg-white/[0.08] hover:border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_8px_32px_rgba(255,255,255,0.05)] text-foreground after:absolute after:inset-0 after:rounded-[inherit] after:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] after:pointer-events-none z-0",
        primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_8px_32px_rgba(0,0,0,0.2)] after:absolute after:inset-0 after:rounded-[inherit] after:shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] after:pointer-events-none z-0",
        destructive: "bg-destructive/90 text-destructive-foreground hover:bg-destructive shadow-[0_8px_32px_rgba(239,68,68,0.15)] after:absolute after:inset-0 after:rounded-[inherit] after:shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] after:pointer-events-none z-0",
        outline: "border border-white/10 bg-transparent hover:bg-white/[0.02] hover:border-white/20 text-foreground after:absolute after:inset-0 after:rounded-[inherit] after:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] after:pointer-events-none z-0",
        secondary: "bg-white/[0.02] border border-transparent hover:bg-white/[0.04] hover:border-white/5 shadow-inner text-foreground",
        ghost: "hover:bg-white/[0.04] dark:hover:bg-white/[0.02] hover:text-foreground text-muted-foreground transition-colors",
        link: "text-foreground underline-offset-4 hover:underline hover:text-foreground/80",
        glass: "bg-white/[0.02] backdrop-blur-xl border border-white/10 hover:bg-white/[0.04] hover:border-white/20 shadow-[0_8px_30px_rgba(0,0,0,0.12)] text-foreground after:absolute after:inset-0 after:rounded-[inherit] after:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] after:pointer-events-none z-0",
        success: "bg-emerald-500/90 text-white hover:bg-emerald-500 shadow-[0_8px_32px_rgba(16,185,129,0.15)] after:absolute after:inset-0 after:rounded-[inherit] after:shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] after:pointer-events-none z-0",
        warning: "bg-amber-500/90 text-white hover:bg-amber-500 shadow-[0_8px_32px_rgba(245,158,11,0.15)] after:absolute after:inset-0 after:rounded-[inherit] after:shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] after:pointer-events-none z-0",
      },
      size: {
        default: "h-11 px-6 py-2.5 min-h-[44px]",
        sm: "h-9 rounded-lg px-4 text-xs min-h-[36px]",
        lg: "h-13 rounded-2xl px-8 text-base min-h-[52px]",
        icon: "h-11 w-11 min-h-[44px] min-w-[44px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    const { t } = useTranslation('common');
    const Comp = asChild ? Slot : "button";
    const isDisabled = disabled || loading;

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={loading}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span className="sr-only">{t("loading", "Loading")}</span>
            {typeof children === 'string' ? children : null}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
