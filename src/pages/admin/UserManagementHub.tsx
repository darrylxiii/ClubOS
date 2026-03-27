import { lazy, Suspense } from "react";
import { useTranslation } from 'react-i18next';
import { Breadcrumb } from "@/components/Breadcrumb";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, UserPlus, Shield, Clock, List } from "lucide-react";
import { useSearchParams, Navigate } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import { PageLoader } from "@/components/PageLoader";
import { OceanBackgroundVideo } from "@/components/OceanBackgroundVideo";
import { UsersDashboard } from "@/components/admin/users/UsersDashboard";

const CandidatesTab = lazy(() => import("@/components/admin/users/CandidatesTab"));
const PartnersTab = lazy(() => import("@/components/admin/users/PartnersTab"));
const StaffTab = lazy(() => import("@/components/admin/users/StaffTab"));
const PendingRequestsTab = lazy(() => import("@/components/admin/users/PendingRequestsTab"));
const AllUsersTab = lazy(() => import("@/components/admin/users/AllUsersTab"));

const UserManagementHub = () => {
  const { t } = useTranslation('admin');
  const { currentRole, loading } = useRole();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "candidates";

  if (loading) return <PageLoader />;
  if (currentRole !== "admin" && currentRole !== "strategist") {
    return <Navigate to="/home" replace />;
  }

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value }, { replace: true });
  };

  return (
    <div className="relative">
      <OceanBackgroundVideo />
      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <Breadcrumb
          items={[
            { label: "Home", path: "/home" },
            { label: "Admin", path: "/admin" },
            { label: "User Management" },
          ]}
        />

        <div className="space-y-2 mb-8">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8" />
            <h1 className="text-4xl font-black uppercase tracking-tight">{t('userManagementHub.title')}</h1>
          </div>
          <p className="text-lg text-muted-foreground">{t('userManagementHub.desc')}</p>
        </div>

        <UsersDashboard />

        <Tabs value={activeTab} onValueChange={handleTabChange} className="mt-8 space-y-6">
          <TabsList className="flex w-full max-w-[900px] overflow-x-auto gap-2 justify-start">
            <TabsTrigger value="candidates" className="gap-2">
              <Users className="w-4 h-4" />
              Candidates
            </TabsTrigger>
            <TabsTrigger value="partners" className="gap-2">
              <UserPlus className="w-4 h-4" />
              Partners
            </TabsTrigger>
            <TabsTrigger value="staff" className="gap-2">
              <Shield className="w-4 h-4" />
              Staff
            </TabsTrigger>
            <TabsTrigger value="requests" className="gap-2">
              <Clock className="w-4 h-4" />
              Pending Requests
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-2">
              <List className="w-4 h-4" />
              All Users
            </TabsTrigger>
          </TabsList>

          <Suspense fallback={<PageLoader />}>
            <TabsContent value="candidates">
              <CandidatesTab />
            </TabsContent>
            <TabsContent value="partners">
              <PartnersTab />
            </TabsContent>
            <TabsContent value="staff">
              <StaffTab />
            </TabsContent>
            <TabsContent value="requests">
              <PendingRequestsTab />
            </TabsContent>
            <TabsContent value="all">
              <AllUsersTab />
            </TabsContent>
          </Suspense>
        </Tabs>
      </div>
    </div>
  );
};

export default UserManagementHub;
