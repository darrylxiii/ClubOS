import { lazy, Suspense } from 'react';
import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import { Loader2 } from 'lucide-react';

const AssessmentsHub = lazy(() => import('@/pages/admin/AssessmentsHub'));

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

export const AdminAssessmentsRoutes = (
  <>
    <Route
      path="/admin/assessments-hub"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>
              <AssessmentsHub />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
  </>
);
