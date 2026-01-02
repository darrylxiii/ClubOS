import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Share2, Link2, Mail, MessageCircle, Copy, Check, 
  QrCode, Twitter, Linkedin, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ReferralShareSheetProps {
  jobId?: string;
  jobTitle?: string;
  companyName?: string;
  referralLink?: string;
  trigger?: React.ReactNode;
}

const shareChannels = [
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: '#0A66C2' },
  { id: 'whatsapp', name: 'WhatsApp', icon: MessageCircle, color: '#25D366' },
  { id: 'twitter', name: 'X/Twitter', icon: Twitter, color: '#1DA1F2' },
  { id: 'email', name: 'Email', icon: Mail, color: '#EA4335' },
];

export function ReferralShareSheet({ 
  jobId, 
  jobTitle = "this opportunity",
  companyName,
  referralLink,
  trigger 
}: ReferralShareSheetProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [customMessage, setCustomMessage] = useState("");

  // Generate referral link with UTM params
  const baseUrl = window.location.origin;
  const generateShareLink = (channel: string) => {
    const params = new URLSearchParams({
      ref: user?.id || '',
      utm_source: channel,
      utm_medium: 'referral',
      utm_campaign: jobId || 'general',
    });
    
    if (referralLink) {
      return `${referralLink}&${params.toString()}`;
    }
    
    return jobId 
      ? `${baseUrl}/jobs/${jobId}?${params.toString()}`
      : `${baseUrl}/jobs?${params.toString()}`;
  };

  const defaultMessage = companyName 
    ? `I thought you might be interested in ${jobTitle} at ${companyName}. Check it out:`
    : `Check out ${jobTitle}. I think it could be a great fit for you:`;

  const shareMessage = customMessage || defaultMessage;

  const handleCopyLink = async (channel: string = 'copy') => {
    const link = generateShareLink(channel);
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    
    // Track share
    trackShare(channel);
    
    toast({
      title: "Link copied!",
      description: "Share it with your network",
    });
  };

  const trackShare = async (channel: string) => {
    if (!user?.id) return;
    
    try {
      await supabase.from('referral_share_tracking').insert({
        user_id: user.id,
        job_id: jobId || null,
        share_channel: channel,
        utm_source: channel,
        utm_medium: 'referral',
        utm_campaign: jobId || 'general',
      });
    } catch (err) {
      console.error('Failed to track share:', err);
    }
  };

  const handleShare = (channel: string) => {
    const link = generateShareLink(channel);
    const text = encodeURIComponent(`${shareMessage}\n\n${link}`);
    const url = encodeURIComponent(link);
    
    let shareUrl = '';
    
    switch (channel) {
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${text}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${text}`;
        break;
      case 'email':
        const subject = encodeURIComponent(`${jobTitle} - Referral`);
        shareUrl = `mailto:?subject=${subject}&body=${text}`;
        break;
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'noopener,noreferrer');
      trackShare(channel);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share & Earn
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Share Referral Link
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="quick" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="quick">Quick Share</TabsTrigger>
            <TabsTrigger value="custom">Custom Message</TabsTrigger>
          </TabsList>
          
          <TabsContent value="quick" className="space-y-4 mt-4">
            {/* Quick share buttons */}
            <div className="grid grid-cols-2 gap-3">
              {shareChannels.map((channel) => {
                const Icon = channel.icon;
                return (
                  <motion.button
                    key={channel.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleShare(channel.id)}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/30 transition-colors"
                  >
                    <div 
                      className="p-2 rounded-full"
                      style={{ backgroundColor: `${channel.color}20` }}
                    >
                      <Icon className="h-4 w-4" style={{ color: channel.color }} />
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {channel.name}
                    </span>
                  </motion.button>
                );
              })}
            </div>
            
            {/* Copy link */}
            <div className="flex gap-2">
              <Input 
                value={generateShareLink('copy')}
                readOnly 
                className="text-sm bg-muted/50"
              />
              <Button 
                variant="secondary" 
                size="icon"
                onClick={() => handleCopyLink()}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            {/* QR Code toggle */}
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setShowQR(!showQR)}
            >
              <QrCode className="h-4 w-4 mr-2" />
              {showQR ? "Hide QR Code" : "Show QR Code"}
            </Button>
            
            <AnimatePresence>
              {showQR && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex justify-center p-4 bg-white rounded-lg"
                >
                  <div className="text-center">
                    <div className="w-32 h-32 bg-muted rounded-lg flex items-center justify-center">
                      <QrCode className="h-16 w-16 text-muted-foreground/50" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Scan to apply
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>
          
          <TabsContent value="custom" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Your Message</Label>
              <Textarea
                placeholder={defaultMessage}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Your Referral Link</Label>
              <div className="flex gap-2">
                <Input 
                  value={generateShareLink('custom')}
                  readOnly 
                  className="text-sm bg-muted/50"
                />
                <Button 
                  variant="secondary" 
                  size="icon"
                  onClick={() => handleCopyLink('custom')}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            
            <div className="flex gap-2 pt-2">
              {shareChannels.slice(0, 2).map((channel) => {
                const Icon = channel.icon;
                return (
                  <Button
                    key={channel.id}
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleShare(channel.id)}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {channel.name}
                  </Button>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
        
        <p className="text-xs text-muted-foreground text-center mt-4">
          Earn rewards when your referrals get hired
        </p>
      </DialogContent>
    </Dialog>
  );
}
