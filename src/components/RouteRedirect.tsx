import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

interface RouteRedirectProps {
  to: string;
  preserveSearch?: boolean;
}

/**
 * Component to redirect deprecated routes to their new consolidated locations
 * Preserves URL parameters when redirecting
 */
export function RouteRedirect({ to, preserveSearch = true }: RouteRedirectProps) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const targetUrl = preserveSearch && location.search 
      ? `${to}${location.search}` 
      : to;
    navigate(targetUrl, { replace: true });
  }, [navigate, to, location.search, preserveSearch]);

  return null;
}
