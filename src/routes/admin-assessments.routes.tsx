import { lazy } from 'react';
import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';

const AssessmentsHub = lazy(() => import('@/pages/admin/AssessmentsHub'));

export const AdminAssessmentsRoutes = (
  <>
    <Route
      path="/admin/assessments-hub"
      element={
        <ProtectedRoute>
          <AssessmentsHub />
        </ProtectedRoute>
      }
    />
  </>
);
