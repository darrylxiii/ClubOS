import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InviteStatsCards } from "./InviteStatsCards";
import { SendInviteTab } from "./SendInviteTab";
import { InviteHistoryTab } from "./InviteHistoryTab";
import { InviteAnalyticsTab } from "./InviteAnalyticsTab";
import { ProvisionedPartnersTab } from "./ProvisionedPartnersTab";
import { PartnerProvisioningModal } from "@/components/admin/PartnerProvisioningModal";
import { Mail, History, BarChart3, Send, Crown, Users } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import type { PrefillData } from "@/components/admin/partner-provisioning/useProvisionForm";

export function InviteDashboardLayout() {
  const [activeTab, setActiveTab] = useState("send");
  const { currentRole } = useRole();
  const isElevated = currentRole === 'admin' || currentRole === 'strategist';
  const [provisionOpen, setProvisionOpen] = useState(false);
  const [provisionPrefill, setProvisionPrefill] = useState<PrefillData | undefined>();

  const openProvisioning = (prefill?: PrefillData) => {
    setProvisionPrefill(prefill);
    setProvisionOpen(true);
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Invite Dashboard</h1>
        <p className="text-muted-foreground">
          Send invitations, track responses, and grow your network
        </p>
      </div>

      {/* Quick Actions Bar */}
      <div className="mb-6 flex flex-wrap gap-3">
        <Button onClick={() => setActiveTab("send")} className="gap-2">
          <Send className="h-4 w-4" />
          Send Invite
        </Button>
        <Button variant="outline" onClick={() => setActiveTab("history")} className="gap-2">
          <History className="h-4 w-4" />
          View History
        </Button>
        {isElevated && (
          <Button
            variant="primary"
            onClick={() => openProvisioning()}
            className="gap-2"
          >
            <Crown className="h-4 w-4" />
            Provision Partner
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <InviteStatsCards />

      {/* Main Tabbed Interface */}
      <div className="mt-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={`grid w-full mb-6 ${isElevated ? 'grid-cols-4' : 'grid-cols-3'}`}>
            <TabsTrigger value="send" className="gap-2">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Send Invites</span>
              <span className="sm:hidden">Send</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Invitation History</span>
              <span className="sm:hidden">History</span>
            </TabsTrigger>
            {isElevated && (
              <TabsTrigger value="provisioned" className="gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Provisioned</span>
                <span className="sm:hidden">Prov.</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
              <span className="sm:hidden">Stats</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="send" className="space-y-4">
            <div className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border rounded-lg p-6 sm:p-8">
              <SendInviteTab onOpenProvisioning={openProvisioning} />
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <div className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border rounded-lg p-6 sm:p-8">
              <InviteHistoryTab />
            </div>
          </TabsContent>

          {isElevated && (
            <TabsContent value="provisioned" className="space-y-4">
              <div className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border rounded-lg p-6 sm:p-8">
                <ProvisionedPartnersTab />
              </div>
            </TabsContent>
          )}

          <TabsContent value="analytics" className="space-y-4">
            <div className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border rounded-lg p-6 sm:p-8">
              <InviteAnalyticsTab />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Provisioning Modal */}
      {isElevated && (
        <PartnerProvisioningModal
          open={provisionOpen}
          onClose={() => setProvisionOpen(false)}
          prefillData={provisionPrefill}
        />
      )}
    </div>
  );
}
