import * as React from "react";
import { cn } from "@/lib/utils";

/* =============================================================================
   THE QUANTUM CLUB - TYPOGRAPHY SYSTEM (LUXURY SPEC)
   
   Hierarchy:
   1. Display: Ceremonial authority (Hero, Major Dividers)
   2. Heading: Structural hierarchy (H1-H6)
   3. Body:    Executive readability (Content)
   4. Label:   Precision metadata (UI)
   ============================================================================= */

// ============================================================================
// PAGE TITLE (H1) -> Heading 2XL
// ============================================================================
interface PageTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: "h1" | "h2";
}

export const PageTitle = React.forwardRef<HTMLHeadingElement, PageTitleProps>(
  ({ className, as: Component = "h1", ...props }, ref) => (
    <Component
      ref={ref}
      className={cn(
        "text-heading-2xl text-foreground", // Was text-4xl
        className
      )}
      {...props}
    />
  )
);
PageTitle.displayName = "PageTitle";

// ============================================================================
// SECTION TITLE (H2) -> Heading XL
// ============================================================================
interface SectionTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: "h2" | "h3";
}

export const SectionTitle = React.forwardRef<HTMLHeadingElement, SectionTitleProps>(
  ({ className, as: Component = "h2", ...props }, ref) => (
    <Component
      ref={ref}
      className={cn(
        "text-heading-xl text-foreground", // Was text-3xl
        className
      )}
      {...props}
    />
  )
);
SectionTitle.displayName = "SectionTitle";

// ============================================================================
// CARD TITLE (H3) -> Heading LG or MD
// ============================================================================
interface CardHeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: "h3" | "h4";
}

export const CardHeading = React.forwardRef<HTMLHeadingElement, CardHeadingProps>(
  ({ className, as: Component = "h3", ...props }, ref) => (
    <Component
      ref={ref}
      className={cn(
        "text-heading-md text-foreground", // Was text-2xl
        className
      )}
      {...props}
    />
  )
);
CardHeading.displayName = "CardHeading";

// ============================================================================
// SUBTITLE -> Body LG
// ============================================================================
type SubtitleProps = React.HTMLAttributes<HTMLParagraphElement>

export const Subtitle = React.forwardRef<HTMLParagraphElement, SubtitleProps>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-body-lg text-muted-foreground", className)} // Was text-lg
      {...props}
    />
  )
);
Subtitle.displayName = "Subtitle";

// ============================================================================
// LABEL -> Label MD
// ============================================================================
type LabelTextProps = React.HTMLAttributes<HTMLSpanElement>

export const LabelText = React.forwardRef<HTMLSpanElement, LabelTextProps>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn("text-label-md text-foreground", className)} // Was text-sm font-medium
      {...props}
    />
  )
);
LabelText.displayName = "LabelText";

// ============================================================================
// CAPTION -> Label SM
// ============================================================================
type CaptionProps = React.HTMLAttributes<HTMLSpanElement>

export const Caption = React.forwardRef<HTMLSpanElement, CaptionProps>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn("text-label-sm text-muted-foreground", className)} // Was text-xs
      {...props}
    />
  )
);
Caption.displayName = "Caption";

// ============================================================================
// DISPLAY -> Display Tokens
// ============================================================================
interface DisplayProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: "h1" | "h2" | "span";
  size?: "xl" | "lg" | "md" | "sm";
}

export const Display = React.forwardRef<HTMLHeadingElement, DisplayProps>(
  ({ className, as: Component = "h1", size = "xl", ...props }, ref) => (
    <Component
      ref={ref}
      className={cn(
        "font-bold text-foreground",
        {
          "text-display-xl": size === "xl",
          "text-display-lg": size === "lg",
          "text-display-md": size === "md",
          "text-display-sm": size === "sm",
        },
        className
      )}
      {...props}
    />
  )
);
Display.displayName = "Display";

// ============================================================================
// BODY TEXT -> Body Tokens
// ============================================================================
interface BodyTextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  size?: "default" | "small" | "large";
  muted?: boolean;
}

export const BodyText = React.forwardRef<HTMLParagraphElement, BodyTextProps>(
  ({ className, size = "default", muted = false, ...props }, ref) => (
    <p
      ref={ref}
      className={cn(
        {
          "text-body-sm": size === "small",
          "text-body-md": size === "default",
          "text-body-lg": size === "large",
        },
        muted && "text-muted-foreground",
        !muted && "text-foreground",
        className
      )}
      {...props}
    />
  )
);
BodyText.displayName = "BodyText";

// ============================================================================
// MICRO -> Label XS
// ============================================================================
type MicroProps = React.HTMLAttributes<HTMLSpanElement>

export const Micro = React.forwardRef<HTMLSpanElement, MicroProps>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn("text-label-xs text-muted-foreground", className)} // Was text-micro
      {...props}
    />
  )
);
Micro.displayName = "Micro";

// ============================================================================
// OVERLINE -> Label XS Uppercase
// ============================================================================
type OverlineProps = React.HTMLAttributes<HTMLSpanElement>

export const Overline = React.forwardRef<HTMLSpanElement, OverlineProps>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "text-label-xs uppercase tracking-wider text-muted-foreground font-semibold",
        className
      )}
      {...props}
    />
  )
);
Overline.displayName = "Overline";

// ============================================================================
// HEADING GROUP
// ============================================================================
interface HeadingGroupProps {
  className?: string;
  heading: React.ReactNode;
  subtitle?: React.ReactNode;
  size?: "page" | "section" | "card";
}

export const HeadingGroup = React.forwardRef<HTMLDivElement, HeadingGroupProps>(
  ({ className, heading, subtitle, size = "section" }, ref) => {
    return (
      <div ref={ref} className={cn("space-y-1", className)}>
        {size === "page" && <PageTitle>{heading}</PageTitle>}
        {size === "section" && <SectionTitle>{heading}</SectionTitle>}
        {size === "card" && <CardHeading>{heading}</CardHeading>}
        {subtitle && <Subtitle>{subtitle}</Subtitle>}
      </div>
    );
  }
);
HeadingGroup.displayName = "HeadingGroup";
