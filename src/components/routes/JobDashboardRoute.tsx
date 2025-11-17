import { ReactNode, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface JobDashboardRouteProps {
  children: ReactNode;
}

/**
 * Route guard for job dashboard access
 * Only allows admin, partner, and strategist roles
 * Redirects candidates to the job detail page
 */
export const JobDashboardRoute = ({ children }: JobDashboardRouteProps) => {
  const { currentRole: role, loading } = useRole();
  const navigate = useNavigate();
  const { jobId } = useParams();

  useEffect(() => {
    if (loading) return;

    const hasAccess = role === 'admin' || role === 'partner' || role === 'strategist';

    if (!hasAccess) {
      // Candidates get redirected to the job detail view
      if (jobId) {
        navigate(`/jobs/${jobId}`, { replace: true });
      } else {
        toast({
          title: "Access denied",
          description: "You don't have permission to access this page",
          variant: "destructive",
        });
        navigate('/home', { replace: true });
      }
    }
  }, [role, loading, navigate, jobId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasAccess = role === 'admin' || role === 'partner' || role === 'strategist';

  if (!hasAccess) {
    return null;
  }

  return <>{children}</>;
};
