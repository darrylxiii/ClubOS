import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Share2,
  Copy,
  Users,
  Link as LinkIcon,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  Network,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface InviteCode {
  id: string;
  code: string;
  created_by_type: string;
  used_by: string | null;
  used_at: string | null;
  expires_at: string;
  is_active: boolean;
  created_at: string;
}

interface ReferralInfo {
  referred_by: string | null;
  referred_by_type: string | null;
  referral_level: number;
  invite_code: string | null;
  total_referrals: number;
}

export const InviteSystem = () => {
  const { user } = useAuth();
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [referralInfo, setReferralInfo] = useState<ReferralInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const baseUrl = window.location.origin;

  useEffect(() => {
    if (user) {
      loadInviteCodes();
      loadReferralInfo();
    }
  }, [user]);

  const loadInviteCodes = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("invite_codes")
        .select("*")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInviteCodes(data || []);
    } catch (error) {
      console.error("Error loading invite codes:", error);
      toast.error("Failed to load invite codes");
    } finally {
      setIsLoading(false);
    }
  };

  const loadReferralInfo = async () => {
    if (!user) return;

    try {
      // Get user's referral info
      const { data: referralData, error: referralError } = await supabase
        .from("referral_network")
        .select("referred_by, referred_by_type, referral_level, invite_code")
        .eq("user_id", user.id)
        .single();

      // Count total referrals made by this user
      const { count, error: countError } = await supabase
        .from("referral_network")
        .select("*", { count: "exact", head: true })
        .eq("referred_by", user.id);

      if (!referralError) {
        setReferralInfo({
          ...referralData,
          total_referrals: count || 0,
        });
      } else if (referralError.code !== "PGRST116") {
        throw referralError;
      }
    } catch (error) {
      console.error("Error loading referral info:", error);
    }
  };

  const generateInviteCode = async () => {
    if (!user) return;

    const activeUnusedCount = inviteCodes.filter(
      (code) => code.is_active && !code.used_by && new Date(code.expires_at) > new Date()
    ).length;

    if (activeUnusedCount >= 5) {
      toast.error("You already have 5 active invite codes", {
        description: "Wait for some to be used or expire before generating more.",
      });
      return;
    }

    setIsGenerating(true);
    try {
      // Generate code via database function
      const { data: codeData, error: codeError } = await supabase.rpc("generate_invite_code");

      if (codeError) throw codeError;

      // Insert the new invite code
      const { error: insertError } = await supabase.from("invite_codes").insert({
        code: codeData,
        created_by: user.id,
        created_by_type: "member",
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      });

      if (insertError) throw insertError;

      toast.success("Invite code generated!", {
        description: "Share this exclusive link with elite talent.",
      });

      loadInviteCodes();
    } catch (error: any) {
      console.error("Error generating invite code:", error);
      if (error.message?.includes("Maximum of 5")) {
        toast.error("Invite limit reached", {
          description: "You can only have 5 active invite codes at a time.",
        });
      } else {
        toast.error("Failed to generate invite code");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const copyInviteLink = (code: string) => {
    const inviteUrl = `${baseUrl}/auth?invite=${code}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedCode(code);
    toast.success("Invite link copied to clipboard!");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const shareInviteLink = async (code: string) => {
    const inviteUrl = `${baseUrl}/auth?invite=${code}`;
    const shareData = {
      title: "Join The Quantum Club",
      text: "You've been invited to join The Quantum Club - an exclusive platform for elite talent.",
      url: inviteUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        toast.success("Invite shared successfully!");
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          copyInviteLink(code);
        }
      }
    } else {
      copyInviteLink(code);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const isExpired = (dateString: string) => {
    return new Date(dateString) < new Date();
  };

  const activeUnusedInvites = inviteCodes.filter(
    (code) => code.is_active && !code.used_by && !isExpired(code.expires_at)
  ).length;

  if (isLoading) {
    return (
      <Card className="border-2 border-accent/20">
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Loading invite system...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-2 border-accent/20 bg-gradient-card shadow-glow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl font-black flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-accent" />
                Exclusive Invites
              </CardTitle>
              <CardDescription className="text-base">
                Share The Quantum Club with elite professionals
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              {activeUnusedInvites} / 5 Available
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-accent/50 bg-accent/5">
            <Network className="h-5 w-5 text-accent" />
            <AlertTitle className="font-bold">Curated Platform</AlertTitle>
            <AlertDescription>
              The Quantum Club is invite-only. Each member receives 5 exclusive invite links to share
              with exceptional talent. We track every connection to maintain our elite community.
            </AlertDescription>
          </Alert>

          {referralInfo && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {referralInfo.referred_by && (
                <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    Invited By
                  </p>
                  <p className="font-bold">
                    {referralInfo.referred_by_type === "recruiter" ? "QC Recruiter" : "Member"}
                  </p>
                </div>
              )}
              <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  Network Level
                </p>
                <p className="font-bold">Level {referralInfo.referral_level}</p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  Your Referrals
                </p>
                <p className="font-bold">{referralInfo.total_referrals} Members</p>
              </div>
            </div>
          )}

          <Button
            onClick={generateInviteCode}
            disabled={isGenerating || activeUnusedInvites >= 5}
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-bold"
            size="lg"
          >
            <LinkIcon className="w-5 h-5 mr-2" />
            {isGenerating ? "Generating..." : "Generate New Invite Code"}
          </Button>
        </CardContent>
      </Card>

      {/* Invite Codes List */}
      <Card className="border-2 border-foreground">
        <CardHeader>
          <CardTitle className="text-lg font-black uppercase">Your Invite Codes</CardTitle>
        </CardHeader>
        <CardContent>
          {inviteCodes.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No invite codes generated yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Generate your first invite to start building your network
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {inviteCodes.map((code) => {
                const expired = isExpired(code.expires_at);
                const used = !!code.used_by;
                const active = code.is_active && !used && !expired;

                return (
                  <div
                    key={code.id}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      active
                        ? "border-accent bg-accent/5"
                        : "border-border bg-secondary/30 opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <code className="text-lg font-black tracking-wider">{code.code}</code>
                          {used && (
                            <Badge className="bg-success text-success-foreground">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Used
                            </Badge>
                          )}
                          {!used && expired && (
                            <Badge variant="destructive">
                              <Clock className="w-3 h-3 mr-1" />
                              Expired
                            </Badge>
                          )}
                          {active && (
                            <Badge variant="secondary" className="border-accent text-accent">
                              <Sparkles className="w-3 h-3 mr-1" />
                              Active
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Created: {formatDate(code.created_at)}</span>
                          {!used && <span>Expires: {formatDate(code.expires_at)}</span>}
                          {used && code.used_at && <span>Used: {formatDate(code.used_at)}</span>}
                        </div>
                      </div>

                      {active && (
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => copyInviteLink(code.code)}
                            variant="outline"
                            size="sm"
                            className="border-accent/50 hover:bg-accent/10"
                          >
                            {copiedCode === code.code ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            onClick={() => shareInviteLink(code.code)}
                            variant="default"
                            size="sm"
                            className="bg-accent text-accent-foreground hover:bg-accent/90"
                          >
                            <Share2 className="w-4 h-4 mr-2" />
                            Share
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
