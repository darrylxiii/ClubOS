import { lazy, Suspense } from 'react';
import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import { PageLoader } from '@/components/PageLoader';

const AssessmentsHub = lazy(() => import('@/pages/admin/AssessmentsHub'));

export const AdminAssessmentsRoutes = (
  <>
    <Route
      path="/admin/assessments-hub"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <AssessmentsHub />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
  </>
);
