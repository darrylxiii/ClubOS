import { lazy } from "react";
import { Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Lazy load shared pages accessible to all authenticated users
const ClubHome = lazy(() => import("@/pages/ClubHome"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Feed = lazy(() => import("@/pages/Feed"));
const Post = lazy(() => import("@/pages/Post"));
const SocialFeed = lazy(() => import("@/pages/SocialFeed"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const Achievements = lazy(() => import("@/pages/Achievements"));
const Inbox = lazy(() => import("@/pages/Inbox"));
const Messages = lazy(() => import("@/pages/Messages"));
const Meetings = lazy(() => import("@/pages/Meetings"));
const MeetingHistory = lazy(() => import("@/pages/MeetingHistory"));
const MeetingIntelligence = lazy(() => import("@/pages/MeetingIntelligence"));
const MeetingInsights = lazy(() => import("@/pages/MeetingInsights"));
const Scheduling = lazy(() => import("@/pages/Scheduling"));
const UnifiedTasks = lazy(() => import("@/pages/UnifiedTasks"));
const ObjectiveWorkspace = lazy(() => import("@/pages/ObjectiveWorkspace"));
const ClubAI = lazy(() => import("@/pages/ClubAI"));
const Academy = lazy(() => import("@/pages/Academy"));
const AcademyCreatorHub = lazy(() => import("@/pages/AcademyCreatorHub"));
const ModuleDetail = lazy(() => import("@/pages/ModuleDetail"));
const CourseDetail = lazy(() => import("@/pages/CourseDetail"));
const ModuleManagement = lazy(() => import("@/pages/ModuleManagement"));
const ModuleEdit = lazy(() => import("@/pages/ModuleEdit"));
const CourseEdit = lazy(() => import("@/pages/CourseEdit"));
const Settings = lazy(() => import("@/pages/Settings"));
const UserSettings = lazy(() => import("@/pages/UserSettings"));
const EnhancedProfile = lazy(() => import("@/pages/EnhancedProfile"));
const PublicUserProfile = lazy(() => import("@/pages/PublicUserProfile"));
const CandidateProfile = lazy(() => import("@/pages/CandidateProfile"));
const ClubDJ = lazy(() => import("@/pages/ClubDJ"));
const Radio = lazy(() => import("@/pages/Radio"));
const RadioListen = lazy(() => import("@/pages/RadioListen"));
const DocumentManagement = lazy(() => import("@/pages/DocumentManagement"));
const EmailSettings = lazy(() => import("@/pages/EmailSettings"));

/**
 * Shared routes accessible to all authenticated users
 * Core platform features, communication, learning
 */
export const sharedRoutes = (
  <>
    {/* Home & Dashboard */}
    <Route path="/home" element={<ProtectedRoute><ClubHome /></ProtectedRoute>} />
    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    
    {/* Feed & Social */}
    <Route path="/feed" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
    <Route path="/posts/:id" element={<ProtectedRoute><Post /></ProtectedRoute>} />
    <Route path="/social-feed" element={<ProtectedRoute><SocialFeed /></ProtectedRoute>} />
    <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
    <Route path="/achievements" element={<ProtectedRoute><Achievements /></ProtectedRoute>} />
    
    {/* Communication */}
    <Route path="/inbox" element={<ProtectedRoute><Inbox /></ProtectedRoute>} />
    <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
    <Route path="/messages/:conversationId" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
    <Route path="/meetings" element={<ProtectedRoute><Meetings /></ProtectedRoute>} />
    <Route path="/meeting-history" element={<ProtectedRoute><MeetingHistory /></ProtectedRoute>} />
    <Route path="/meeting-intelligence" element={<ProtectedRoute><MeetingIntelligence /></ProtectedRoute>} />
    <Route path="/meeting-insights/:meetingId" element={<ProtectedRoute><MeetingInsights /></ProtectedRoute>} />
    <Route path="/scheduling" element={<ProtectedRoute><Scheduling /></ProtectedRoute>} />
    
    {/* Tasks */}
    <Route path="/unified-tasks" element={<ProtectedRoute><UnifiedTasks /></ProtectedRoute>} />
    <Route path="/objectives/:id" element={<ProtectedRoute><ObjectiveWorkspace /></ProtectedRoute>} />
    
    {/* AI */}
    <Route path="/club-ai" element={<ProtectedRoute><ClubAI /></ProtectedRoute>} />
    
    {/* Academy & Learning */}
    <Route path="/academy" element={<ProtectedRoute><Academy /></ProtectedRoute>} />
    <Route path="/academy/creator" element={<ProtectedRoute><AcademyCreatorHub /></ProtectedRoute>} />
    <Route path="/modules/:moduleId" element={<ProtectedRoute><ModuleDetail /></ProtectedRoute>} />
    <Route path="/modules/:moduleId/manage" element={<ProtectedRoute><ModuleManagement /></ProtectedRoute>} />
    <Route path="/modules/:moduleId/edit" element={<ProtectedRoute><ModuleEdit /></ProtectedRoute>} />
    <Route path="/courses/:slug" element={<ProtectedRoute><CourseDetail /></ProtectedRoute>} />
    <Route path="/courses/:slug/edit" element={<ProtectedRoute><CourseEdit /></ProtectedRoute>} />
    
    {/* Profile & Settings */}
    <Route path="/profile" element={<ProtectedRoute><EnhancedProfile /></ProtectedRoute>} />
    <Route path="/profile/:username" element={<ProtectedRoute><PublicUserProfile /></ProtectedRoute>} />
    <Route path="/candidate/:id" element={<ProtectedRoute><CandidateProfile /></ProtectedRoute>} />
    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
    <Route path="/user-settings" element={<ProtectedRoute><UserSettings /></ProtectedRoute>} />
    
    {/* Radio & Music */}
    <Route path="/club-dj" element={<ProtectedRoute><ClubDJ /></ProtectedRoute>} />
    <Route path="/radio" element={<ProtectedRoute><Radio /></ProtectedRoute>} />
    <Route path="/radio/:playlistId" element={<ProtectedRoute><RadioListen /></ProtectedRoute>} />
    
    {/* Documents & Email */}
    <Route path="/documents" element={<ProtectedRoute><DocumentManagement /></ProtectedRoute>} />
    <Route path="/email-settings" element={<ProtectedRoute><EmailSettings /></ProtectedRoute>} />
  </>
);
