import { ChevronRight, Home } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumb = ({ items, className }: BreadcrumbProps) => {
  const location = useLocation();

  // Auto-generate breadcrumbs from path if not provided
  const breadcrumbItems: BreadcrumbItem[] = items || (() => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    
    const generatedItems: BreadcrumbItem[] = [
      { label: 'Home', path: '/home' }
    ];

    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      // Format segment for display
      const label = segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      // Last segment has no path (current page)
      generatedItems.push({
        label,
        path: index === pathSegments.length - 1 ? undefined : currentPath
      });
    });

    return generatedItems;
  })();

  return (
    <nav className={cn("flex items-center gap-2 text-sm text-muted-foreground mb-6", className)}>
      {breadcrumbItems.map((item, index) => {
        const isLast = index === breadcrumbItems.length - 1;
        
        return (
          <div key={index} className="flex items-center gap-2">
            {index === 0 && <Home className="h-3.5 w-3.5" />}
            
            {item.path ? (
              <Link 
                to={item.path} 
                className="hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-foreground font-medium">{item.label}</span>
            )}
            
            {!isLast && <ChevronRight className="h-3.5 w-3.5" />}
          </div>
        );
      })}
    </nav>
  );
};
