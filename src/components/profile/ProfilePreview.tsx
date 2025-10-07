import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Eye, 
  Share2, 
  Copy, 
  QrCode,
  Linkedin,
  Twitter,
  Mail,
  Check
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ProfilePreviewProps {
  profile: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    current_title: string | null;
    location: string | null;
    career_preferences: string | null;
    email_verified: boolean;
  };
  achievements: any[];
}

export function ProfilePreview({ profile, achievements }: ProfilePreviewProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const profileUrl = `${window.location.origin}/profile/${profile.id}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    toast.success("Profile link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = (platform: string) => {
    const text = `Check out ${profile.full_name}'s profile on The Quantum Club`;
    const urls: Record<string, string> = {
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(profileUrl)}`,
      email: `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(profileUrl)}`,
    };

    if (urls[platform]) {
      window.open(urls[platform], '_blank');
      toast.success(`Opening ${platform}...`);
    }
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        className="gap-2 glass border-accent/30"
      >
        <Eye className="w-4 h-4" />
        Preview & Share
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl glass backdrop-blur-xl border-2 border-accent/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-accent" />
              Share Your Profile
            </DialogTitle>
            <DialogDescription>
              See how your profile looks when shared and distribute it across platforms
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Preview Card */}
            <Card className="border-2 border-accent/30 glass backdrop-blur-xl overflow-hidden">
              <div className="h-24 bg-gradient-accent" />
              <CardContent className="relative -mt-12 p-6">
                <div className="flex items-start gap-4">
                  <Avatar className="w-24 h-24 border-4 border-background ring-4 ring-accent/20">
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback className="text-2xl font-black bg-gradient-accent text-white">
                      {profile.full_name?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 pt-4">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-2xl font-black">{profile.full_name}</h3>
                      {profile.email_verified && (
                        <Badge variant="secondary" className="text-xs">Verified</Badge>
                      )}
                    </div>
                    {profile.current_title && (
                      <p className="text-muted-foreground mb-2">{profile.current_title}</p>
                    )}
                    {profile.location && (
                      <p className="text-sm text-muted-foreground">{profile.location}</p>
                    )}
                  </div>
                </div>

                {profile.career_preferences && (
                  <div className="mt-4 p-4 glass rounded-lg">
                    <p className="text-sm line-clamp-3">{profile.career_preferences}</p>
                  </div>
                )}

                {achievements.length > 0 && (
                  <div className="mt-4 flex gap-2">
                    {achievements.slice(0, 5).map((achievement, idx) => (
                      <div
                        key={idx}
                        className="text-2xl glass rounded-lg p-2 border border-accent/20"
                      >
                        {achievement.achievements?.badge_emoji || "🏆"}
                      </div>
                    ))}
                    {achievements.length > 5 && (
                      <div className="glass rounded-lg p-2 border border-accent/20 flex items-center justify-center text-sm font-bold">
                        +{achievements.length - 5}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Share Options */}
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Share Link</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={profileUrl}
                    readOnly
                    className="flex-1 px-3 py-2 glass rounded-lg border border-accent/30 text-sm"
                  />
                  <Button onClick={handleCopy} className="gap-2">
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Share On</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleShare('linkedin')}
                    className="gap-2 flex-1"
                  >
                    <Linkedin className="w-4 h-4" />
                    LinkedIn
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleShare('twitter')}
                    className="gap-2 flex-1"
                  >
                    <Twitter className="w-4 h-4" />
                    Twitter
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleShare('email')}
                    className="gap-2 flex-1"
                  >
                    <Mail className="w-4 h-4" />
                    Email
                  </Button>
                </div>
              </div>

              <div className="p-4 glass rounded-lg border border-accent/30 text-center">
                <QrCode className="w-12 h-12 mx-auto mb-2 text-accent" />
                <p className="text-sm text-muted-foreground">
                  QR Code generation coming soon
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
