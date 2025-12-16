import * as React from "react";
import { cn } from "@/lib/utils";

/* =============================================================================
   THE QUANTUM CLUB - TYPOGRAPHY SYSTEM
   
   Type Scale (Mobile → Desktop):
   - Display:    48px → 72px (Hero headlines, landing pages)
   - H1:         30px → 36px (Page titles)
   - H2:         24px → 30px (Section titles)
   - H3:         20px → 24px (Card titles, subsections)
   - H4:         18px → 20px (Card headers, panel titles)
   - Body:       16px (Base text)
   - Small:      14px (Secondary text)
   - Caption:    12px (Labels, hints, metadata)
   - Micro:      11px (Badges, timestamps)
   ============================================================================= */

// ============================================================================
// PAGE TITLE - For all main page headers
// ============================================================================
interface PageTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: "h1" | "h2";
}

export const PageTitle = React.forwardRef<HTMLHeadingElement, PageTitleProps>(
  ({ className, as: Component = "h1", ...props }, ref) => (
    <Component
      ref={ref}
      className={cn(
        "text-3xl sm:text-4xl font-bold tracking-tight text-foreground",
        className
      )}
      {...props}
    />
  )
);
PageTitle.displayName = "PageTitle";

// ============================================================================
// SECTION TITLE - For major sections within pages
// ============================================================================
interface SectionTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: "h2" | "h3";
}

export const SectionTitle = React.forwardRef<HTMLHeadingElement, SectionTitleProps>(
  ({ className, as: Component = "h2", ...props }, ref) => (
    <Component
      ref={ref}
      className={cn(
        "text-xl sm:text-2xl font-semibold tracking-tight text-foreground",
        className
      )}
      {...props}
    />
  )
);
SectionTitle.displayName = "SectionTitle";

// ============================================================================
// CARD TITLE - For card headers (consistent with CardTitle)
// ============================================================================
interface CardHeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: "h3" | "h4";
}

export const CardHeading = React.forwardRef<HTMLHeadingElement, CardHeadingProps>(
  ({ className, as: Component = "h3", ...props }, ref) => (
    <Component
      ref={ref}
      className={cn(
        "text-lg font-semibold tracking-tight text-foreground",
        className
      )}
      {...props}
    />
  )
);
CardHeading.displayName = "CardHeading";

// ============================================================================
// SUBTITLE - For descriptions and secondary headings
// ============================================================================
interface SubtitleProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export const Subtitle = React.forwardRef<HTMLParagraphElement, SubtitleProps>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-base text-muted-foreground", className)}
      {...props}
    />
  )
);
Subtitle.displayName = "Subtitle";

// ============================================================================
// LABEL - For form labels and small headings
// ============================================================================
interface LabelTextProps extends React.HTMLAttributes<HTMLSpanElement> {}

export const LabelText = React.forwardRef<HTMLSpanElement, LabelTextProps>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn("text-sm font-medium text-foreground", className)}
      {...props}
    />
  )
);
LabelText.displayName = "LabelText";

// ============================================================================
// CAPTION - For hints, metadata, timestamps
// ============================================================================
interface CaptionProps extends React.HTMLAttributes<HTMLSpanElement> {}

export const Caption = React.forwardRef<HTMLSpanElement, CaptionProps>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn("text-xs text-muted-foreground", className)}
      {...props}
    />
  )
);
Caption.displayName = "Caption";

// ============================================================================
// DISPLAY - For hero sections and large statements
// ============================================================================
interface DisplayProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: "h1" | "h2" | "span";
}

export const Display = React.forwardRef<HTMLHeadingElement, DisplayProps>(
  ({ className, as: Component = "h1", ...props }, ref) => (
    <Component
      ref={ref}
      className={cn(
        "text-5xl sm:text-6xl lg:text-7xl font-black tracking-tighter text-foreground",
        className
      )}
      {...props}
    />
  )
);
Display.displayName = "Display";

// ============================================================================
// BODY TEXT - For regular paragraphs
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
          "text-sm": size === "small",
          "text-base": size === "default",
          "text-lg": size === "large",
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
// MICRO TEXT - For badges, tags, tiny labels
// ============================================================================
interface MicroProps extends React.HTMLAttributes<HTMLSpanElement> {}

export const Micro = React.forwardRef<HTMLSpanElement, MicroProps>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn("text-[11px] font-medium text-muted-foreground", className)}
      {...props}
    />
  )
);
Micro.displayName = "Micro";

// ============================================================================
// OVERLINE - For category labels and section markers
// ============================================================================
interface OverlineProps extends React.HTMLAttributes<HTMLSpanElement> {}

export const Overline = React.forwardRef<HTMLSpanElement, OverlineProps>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "text-xs font-semibold uppercase tracking-wider text-muted-foreground",
        className
      )}
      {...props}
    />
  )
);
Overline.displayName = "Overline";

// ============================================================================
// HEADING GROUP - For title + subtitle combinations
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
