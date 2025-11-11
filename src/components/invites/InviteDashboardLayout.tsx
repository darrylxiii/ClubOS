import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InviteStatsCards } from "./InviteStatsCards";
import { Mail, Users, History, BarChart3, Send, Upload } from "lucide-react";

export function InviteDashboardLayout() {
  const [activeTab, setActiveTab] = useState("send");

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
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Import Contacts
        </Button>
        <Button variant="outline" onClick={() => setActiveTab("analytics")} className="gap-2">
          <BarChart3 className="h-4 w-4" />
          View Analytics
        </Button>
      </div>

      {/* Stats Cards */}
      <InviteStatsCards />

      {/* Main Tabbed Interface */}
      <div className="mt-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="send" className="gap-2">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Send Invites</span>
              <span className="sm:hidden">Send</span>
            </TabsTrigger>
            <TabsTrigger value="browse" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Browse Candidates</span>
              <span className="sm:hidden">Browse</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Invitation History</span>
              <span className="sm:hidden">History</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
              <span className="sm:hidden">Stats</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="send" className="space-y-4">
            <div className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border rounded-lg p-8">
              <div className="text-center py-12">
                <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">Bulk Email Invite System</h3>
                <p className="text-muted-foreground">
                  Coming in Phase 2: Send multiple invitations at once with custom templates
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="browse" className="space-y-4">
            <div className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border rounded-lg p-8">
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">Candidate Profile Browser</h3>
                <p className="text-muted-foreground">
                  Coming in Phase 3: Browse and invite existing candidate profiles
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <div className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border rounded-lg p-8">
              <div className="text-center py-12">
                <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">Invitation Tracking & History</h3>
                <p className="text-muted-foreground">
                  Coming in Phase 4: Track all your invitations and their status
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border rounded-lg p-8">
              <div className="text-center py-12">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">Analytics & Insights</h3>
                <p className="text-muted-foreground">
                  Coming in Phase 6: View detailed analytics on your invitation performance
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
