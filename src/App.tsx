import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { RoleProvider } from "@/contexts/RoleContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import ClubHome from "./pages/ClubHome";
import Dashboard from "./pages/Dashboard";
import Jobs from "./pages/Jobs";
import TasksPilot from "./pages/TasksPilot";
import ClubAI from "./pages/ClubAI";
import Onboarding from "./pages/Onboarding";
import PartnerOnboarding from "./pages/PartnerOnboarding";
import UserSettings from "./pages/UserSettings";
import EnhancedProfile from "./pages/EnhancedProfile";
import PublicUserProfile from "./pages/PublicUserProfile";
import SharedProfile from "./pages/SharedProfile";
import CandidateProfile from "./pages/CandidateProfile";
import Referrals from "./pages/Referrals";
import InterviewPrep from "./pages/InterviewPrep";
import MeetingHistory from "./pages/MeetingHistory";
import Messages from "./pages/Messages";
import Applications from "./pages/Applications";
import CompanyApplications from "./pages/CompanyApplications";
import Companies from "./pages/Companies";
import CompanyPage from "./pages/CompanyPage";
import Scheduling from "./pages/Scheduling";
import PartnerDashboard from "./pages/PartnerDashboard";
import JobDashboard from "./pages/JobDashboard";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import Feed from "./pages/Feed";
import Post from "./pages/Post";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import SocialFeed from "./pages/SocialFeed";
import SocialManagement from "./pages/SocialManagement";
import Analytics from "./pages/Analytics";
import Achievements from "./pages/Achievements";
import BookingPage from "./pages/BookingPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <RoleProvider>
            <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Navigate to="/auth" replace />} />
            <Route path="/book/:slug" element={<BookingPage />} />
            <Route path="/share/:token" element={<SharedProfile />} />
            <Route
              path="/home"
              element={
                <ProtectedRoute>
                  <ClubHome />
                </ProtectedRoute>
              }
            />
            <Route
              path="/club-ai"
              element={
                <ProtectedRoute>
                  <ClubAI />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/partner-dashboard"
              element={
                <ProtectedRoute>
                  <PartnerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/jobs/:jobId/dashboard"
              element={
                <ProtectedRoute>
                  <JobDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/jobs"
              element={
                <ProtectedRoute>
                  <Jobs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tasks-pilot"
              element={
                <ProtectedRoute>
                  <TasksPilot />
                </ProtectedRoute>
              }
            />
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <Onboarding />
                </ProtectedRoute>
              }
            />
            <Route
              path="/partner-onboarding"
              element={
                <ProtectedRoute>
                  <PartnerOnboarding />
                </ProtectedRoute>
              }
            />
            <Route
              path="/user-settings"
              element={
                <ProtectedRoute>
                  <UserSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <EnhancedProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile/:userId"
              element={
                <ProtectedRoute>
                  <PublicUserProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/candidates/:candidateId"
              element={
                <ProtectedRoute>
                  <CandidateProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/referrals"
              element={
                <ProtectedRoute>
                  <Referrals />
                </ProtectedRoute>
              }
            />
            <Route
              path="/interview-prep"
              element={
                <ProtectedRoute>
                  <InterviewPrep />
                </ProtectedRoute>
              }
            />
            <Route
              path="/meeting-history"
              element={
                <ProtectedRoute>
                  <MeetingHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/messages"
              element={
                <ProtectedRoute>
                  <Messages />
                </ProtectedRoute>
              }
            />
            <Route
              path="/applications"
              element={
                <ProtectedRoute>
                  <Applications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/company-applications"
              element={
                <ProtectedRoute>
                  <CompanyApplications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/companies"
              element={
                <ProtectedRoute>
                  <Companies />
                </ProtectedRoute>
              }
            />
            <Route
              path="/companies/:slug"
              element={
                <ProtectedRoute>
                  <CompanyPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/scheduling"
              element={
                <ProtectedRoute>
                  <Scheduling />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <Admin />
                </ProtectedRoute>
              }
            />
            <Route
              path="/feed"
              element={
                <ProtectedRoute>
                  <Feed />
                </ProtectedRoute>
              }
            />
            <Route path="/post/:id" element={<Post />} />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/social-feed"
              element={
                <ProtectedRoute>
                  <SocialFeed />
                </ProtectedRoute>
              }
            />
            <Route
              path="/social-management"
              element={
                <ProtectedRoute>
                  <SocialManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <Analytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/achievements"
              element={
                <ProtectedRoute>
                  <Achievements />
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
            </Routes>
          </RoleProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
