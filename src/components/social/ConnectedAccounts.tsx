import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Instagram, Twitter, Video, Linkedin, Facebook, Youtube, Plus, Trash2, RefreshCw, ExternalLink } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SocialAccount {
  id: string;
  platform: string;
  username: string;
  display_name: string;
  avatar_url: string;
  profile_url: string;
  is_active: boolean;
  created_at: string;
}

export const ConnectedAccounts = () => {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("social_media_accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error("Error fetching accounts:", error);
      toast.error("Failed to load connected accounts");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    try {
      const { error } = await supabase
        .from("social_media_accounts")
        .delete()
        .eq("id", accountId);

      if (error) throw error;
      
      toast.success("Account disconnected");
      fetchAccounts();
    } catch (error) {
      console.error("Error disconnecting account:", error);
      toast.error("Failed to disconnect account");
    }
  };

  const handleConnect = (platform: string) => {
    toast.info(`Opening ${platform} connection...`, {
      description: "You'll be redirected to authenticate"
    });
    // In production, this would open OAuth flow
  };

  const getPlatformIcon = (platform: string) => {
    const icons: Record<string, any> = {
      instagram: Instagram,
      twitter: Twitter,
      tiktok: Video,
      youtube: Youtube,
      linkedin: Linkedin,
      facebook: Facebook
    };
    const Icon = icons[platform] || Facebook;
    return <Icon className="w-full h-full" />;
  };

  const getPlatformColor = (platform: string) => {
    return "";
  };

  const platforms = ["instagram", "twitter", "tiktok", "youtube", "linkedin", "facebook"];

  return (
    <div className="space-y-6">
      {/* Connected Accounts */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Connected Accounts</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading ? (
            <div className="col-span-2 text-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            </div>
          ) : accounts.length === 0 ? (
            <Card className="col-span-2 p-12 text-center bg-card/50">
              <div className="text-6xl mb-4">🔗</div>
              <h3 className="text-xl font-semibold mb-2">No Accounts Connected</h3>
              <p className="text-muted-foreground">
                Connect your social media accounts to start managing them
              </p>
            </Card>
          ) : (
            accounts.map((account) => (
              <Card key={account.id} className="p-6 hover:bg-card/80 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 text-foreground">
                      {getPlatformIcon(account.platform)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{account.display_name}</h4>
                        <Badge variant={account.is_active ? "default" : "secondary"}>
                          {account.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">@{account.username}</p>
                    </div>
                  </div>
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={account.avatar_url} />
                    <AvatarFallback>{account.username[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 gap-2"
                    onClick={() => window.open(account.profile_url, '_blank')}
                  >
                    <ExternalLink className="h-3 w-3" />
                    View Profile
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2">
                    <RefreshCw className="h-3 w-3" />
                    Sync
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive hover:text-destructive-foreground">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Disconnect Account?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove @{account.username} from your connected accounts. 
                          You can reconnect it anytime.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDisconnect(account.id)}>
                          Disconnect
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Available Platforms */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Connect More Platforms</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {platforms.map((platform) => {
            const isConnected = accounts.some(a => a.platform === platform);
            return (
              <Card 
                key={platform}
                className={`p-6 text-center cursor-pointer hover:scale-105 transition-transform ${
                  isConnected ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                onClick={() => !isConnected && handleConnect(platform)}
              >
                <div className="w-8 h-8 text-foreground mx-auto mb-3">
                  {getPlatformIcon(platform)}
                </div>
                <p className="font-medium capitalize">{platform}</p>
                {isConnected && (
                  <Badge variant="secondary" className="mt-2 text-xs">Connected</Badge>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};