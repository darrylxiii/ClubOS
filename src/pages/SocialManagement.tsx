import { AppLayout } from "@/components/AppLayout";
import { RoleGate } from "@/components/RoleGate";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Instagram, Twitter, Video, Linkedin, Facebook, Calendar, BarChart3, MessageSquare, Hash } from "lucide-react";
import { ConnectedAccounts } from "@/components/social/ConnectedAccounts";
import { ContentScheduler } from "@/components/social/ContentScheduler";
import { SocialAnalytics } from "@/components/social/SocialAnalytics";
import { UnifiedInbox } from "@/components/social/UnifiedInbox";
import { HashtagManager } from "@/components/social/HashtagManager";
import { CreatePostDialog } from "@/components/social/CreatePostDialog";

const SocialManagement = () => {
  const [showCreatePost, setShowCreatePost] = useState(false);

  return (
    <AppLayout>
      <RoleGate 
        allowedRoles={['partner', 'admin']} 
        fallback={
          <div className="container mx-auto px-4 py-8">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You don't have permission to access Social Media Management. This feature is available for Partners and Admins only.
              </AlertDescription>
            </Alert>
          </div>
        }
      >
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-black uppercase tracking-tight">
                Social Media Management
              </h1>
              <p className="text-muted-foreground mt-2">
                Manage all your social media accounts, schedule posts, and track analytics
              </p>
            </div>
            <Button onClick={() => setShowCreatePost(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Post
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Instagram</p>
                  <p className="text-2xl font-bold">2.4K</p>
                  <p className="text-xs text-muted-foreground">followers</p>
                </div>
                <Instagram className="h-8 w-8 text-purple-500" />
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Twitter</p>
                  <p className="text-2xl font-bold">1.8K</p>
                  <p className="text-xs text-muted-foreground">followers</p>
                </div>
                <Twitter className="h-8 w-8 text-blue-500" />
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-black/10 to-black/20 border-black/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">TikTok</p>
                  <p className="text-2xl font-bold">5.2K</p>
                  <p className="text-xs text-muted-foreground">followers</p>
                </div>
                <Video className="h-8 w-8" />
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-blue-700/10 to-blue-800/10 border-blue-700/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">LinkedIn</p>
                  <p className="text-2xl font-bold">3.1K</p>
                  <p className="text-xs text-muted-foreground">connections</p>
                </div>
                <Linkedin className="h-8 w-8 text-blue-700" />
              </div>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="accounts" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5 lg:w-auto">
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
      </div>

        {/* Create Post Dialog */}
        <CreatePostDialog open={showCreatePost} onOpenChange={setShowCreatePost} />
      </RoleGate>
    </AppLayout>
  );
};

export default SocialManagement;