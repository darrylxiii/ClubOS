import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { WorkspacePage } from '@/hooks/useWorkspacePages';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageBreadcrumbsProps {
  page: WorkspacePage;
  pages: WorkspacePage[];
  className?: string;
}

export function PageBreadcrumbs({ page, pages, className }: PageBreadcrumbsProps) {
  // Build breadcrumb trail by traversing up parent_page_id
  const breadcrumbs = useMemo(() => {
    const trail: WorkspacePage[] = [];
    let currentPage: WorkspacePage | undefined = page;
    
    // Traverse up the parent chain
    while (currentPage) {
      trail.unshift(currentPage);
      if (currentPage.parent_page_id) {
        currentPage = pages.find(p => p.id === currentPage!.parent_page_id);
      } else {
        break;
      }
    }
    
    return trail;
  }, [page, pages]);

  if (breadcrumbs.length <= 1) {
    // No breadcrumbs needed for root pages
    return null;
  }

  return (
    <nav className={cn("flex items-center text-sm", className)}>
      <Link 
        to="/pages"
        className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>
      
      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1;
        
        return (
          <div key={crumb.id} className="flex items-center">
            <ChevronRight className="h-3.5 w-3.5 mx-1.5 text-muted-foreground/50" />
            {isLast ? (
              <span className="flex items-center gap-1 font-medium truncate max-w-[200px]">
                <span className="text-sm">{crumb.icon_emoji || '📄'}</span>
                <span>{crumb.title || 'Untitled'}</span>
              </span>
            ) : (
              <Link
                to={`/pages/${crumb.id}`}
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors truncate max-w-[150px]"
              >
                <span className="text-sm">{crumb.icon_emoji || '📄'}</span>
                <span>{crumb.title || 'Untitled'}</span>
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
