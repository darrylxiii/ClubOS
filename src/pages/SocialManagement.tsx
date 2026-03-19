import { RoleGate } from "@/components/RoleGate";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Instagram, Twitter, Video, Linkedin, Facebook, Calendar, BarChart3, MessageSquare, Hash } from "lucide-react";
import { ConnectedAccounts } from "@/components/social/ConnectedAccounts";
import { ContentScheduler } from "@/components/social/ContentScheduler";
import { SocialAnalytics } from "@/components/social/SocialAnalytics";
import { UnifiedInbox } from "@/components/social/UnifiedInbox";
import { HashtagManager } from "@/components/social/HashtagManager";
import { CreatePostDialog } from "@/components/social/CreatePostDialog";
import { PartnerInlineStats } from "@/components/partner/PartnerInlineStats";

const SocialManagement = () => {
  const [showCreatePost, setShowCreatePost] = useState(false);

  return (
    <RoleGate 
      allowedRoles={['partner', 'admin']} 
      fallback={
        <div className="py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You don't have permission to access Social Media Management. This feature is available for Partners and Admins only.
            </AlertDescription>
          </Alert>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="flex items-center justify-end">
          <Button onClick={() => setShowCreatePost(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Post
          </Button>
        </div>

        <PartnerInlineStats
          stats={[
            { value: 2400, label: 'Instagram', icon: Instagram },
            { value: 1800, label: 'Twitter', icon: Twitter },
            { value: 5200, label: 'TikTok', icon: Video },
            { value: 3100, label: 'LinkedIn', icon: Linkedin, highlight: true },
          ]}
        />

        <Tabs defaultValue="accounts" className="space-y-6">
          <TabsList className="bg-card/30 backdrop-blur-sm border border-border/20">
            <TabsTrigger value="accounts" className="gap-2">
              <Facebook className="h-4 w-4" />
              Accounts
            </TabsTrigger>
            <TabsTrigger value="scheduler" className="gap-2">
              <Calendar className="h-4 w-4" />
              Scheduler
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="inbox" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Inbox
            </TabsTrigger>
            <TabsTrigger value="hashtags" className="gap-2">
              <Hash className="h-4 w-4" />
              Hashtags
            </TabsTrigger>
          </TabsList>

          <TabsContent value="accounts" className="space-y-4">
            <ConnectedAccounts />
          </TabsContent>
          <TabsContent value="scheduler" className="space-y-4">
            <ContentScheduler />
          </TabsContent>
          <TabsContent value="analytics" className="space-y-4">
            <SocialAnalytics />
          </TabsContent>
          <TabsContent value="inbox" className="space-y-4">
            <UnifiedInbox />
          </TabsContent>
          <TabsContent value="hashtags" className="space-y-4">
            <HashtagManager />
          </TabsContent>
        </Tabs>
      </div>

      <CreatePostDialog open={showCreatePost} onOpenChange={setShowCreatePost} />
    </RoleGate>
  );
};

export default SocialManagement;
