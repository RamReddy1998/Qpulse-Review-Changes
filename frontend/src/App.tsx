import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/slices/authStore';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { DashboardLayout } from './components/layouts/DashboardLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { LearnerDashboard } from './pages/learner/LearnerDashboard';
import { SmartPractice } from './pages/learner/SmartPractice';
import { MockTestPage } from './pages/learner/MockTestPage';
import { ReadinessPage } from './pages/learner/ReadinessPage';
import { MistakeAnalysis } from './pages/learner/MistakeAnalysis';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { LearnersPage } from './pages/admin/LearnersPage';
import { BatchManagement } from './pages/admin/BatchManagement';
import { QuestionUploadPage } from './pages/admin/QuestionUploadPage';
import { AnalyticsPage } from './pages/admin/AnalyticsPage';

function App() {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to={user?.role === 'ADMIN' ? '/admin' : '/dashboard'} replace />
            ) : (
              <LoginPage />
            )
          }
        />

        {/* Learner Routes */}
        <Route
          element={
            <ProtectedRoute allowedRoles={['LEARNER', 'ADMIN']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<LearnerDashboard />} />
          <Route path="/practice" element={<SmartPractice />} />
          <Route path="/mock-tests" element={<MockTestPage />} />
          <Route path="/readiness" element={<ReadinessPage />} />
          <Route path="/mistakes" element={<MistakeAnalysis />} />
        </Route>

        {/* Admin Routes */}
        <Route
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/learners" element={<LearnersPage />} />
          <Route path="/admin/batches" element={<BatchManagement />} />
          <Route path="/admin/upload" element={<QuestionUploadPage />} />
          <Route path="/admin/analytics" element={<AnalyticsPage />} />
        </Route>

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
