import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface BreadcrumbMobileProps {
  items: Array<{
    label: string;
    href?: string;
  }>;
  className?: string;
}

/**
 * Mobile-optimized breadcrumb that shows only back button + current page
 * Desktop shows full breadcrumb trail
 */
export function BreadcrumbMobile({ items, className }: BreadcrumbMobileProps) {
  const navigate = useNavigate();
  const currentPage = items[items.length - 1];
  const previousPage = items[items.length - 2];

  const handleBack = () => {
    if (previousPage?.href) {
      navigate(previousPage.href);
    } else {
      navigate(-1);
    }
  };

  return (
    <>
      {/* Mobile: Back button + current page */}
      <div className={cn("flex items-center gap-2 md:hidden", className)}>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="min-h-[44px] min-w-[44px]"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="text-sm font-medium truncate">{currentPage.label}</span>
      </div>

      {/* Desktop: Full breadcrumb trail */}
      <nav className={cn("hidden md:flex items-center gap-2 text-sm", className)}>
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            {index > 0 && <span className="text-muted-foreground">/</span>}
            {item.href && index < items.length - 1 ? (
              <button
                onClick={() => navigate(item.href!)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.label}
              </button>
            ) : (
              <span
                className={cn(
                  index === items.length - 1
                    ? "text-foreground font-medium"
                    : "text-muted-foreground"
                )}
              >
                {item.label}
              </span>
            )}
          </div>
        ))}
      </nav>
    </>
  );
}
