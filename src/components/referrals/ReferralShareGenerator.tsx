import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Copy, 
  Share2, 
  Linkedin, 
  MessageCircle, 
  Mail,
  QrCode,
  CheckCircle2
} from 'lucide-react';

export function ReferralShareGenerator() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [customTag, setCustomTag] = useState('');

  const baseUrl = window.location.origin;
  const referralCode = user?.id?.slice(0, 8) || 'QUANTUM';
  const referralLink = `${baseUrl}/join?ref=${referralCode}${customTag ? `&utm_campaign=${customTag}` : ''}`;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  const shareViaLinkedIn = () => {
    const text = encodeURIComponent(
      `Join The Quantum Club - an exclusive talent network connecting top professionals with exceptional opportunities. ${referralLink}`
    );
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`, '_blank');
  };

  const shareViaWhatsApp = () => {
    const text = encodeURIComponent(
      `Hey! I thought you might be interested in The Quantum Club. It's an invite-only network for top talent. Join here: ${referralLink}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent('Invitation to The Quantum Club');
    const body = encodeURIComponent(
      `Hi,\n\nI'd like to invite you to join The Quantum Club - an exclusive talent network that connects exceptional professionals with premium career opportunities.\n\nJoin using my referral link: ${referralLink}\n\nLooking forward to seeing you there!`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  const shareTemplates = [
    {
      platform: 'LinkedIn',
      icon: <Linkedin className="h-5 w-5" />,
      message: `Excited to share @TheQuantumClub - a curated network connecting top talent with exceptional opportunities. If you're looking for your next career move, check it out: ${referralLink}`,
      color: 'bg-[#0077B5] hover:bg-[#005885]',
    },
    {
      platform: 'WhatsApp',
      icon: <MessageCircle className="h-5 w-5" />,
      message: `Hey! Have you heard of The Quantum Club? It's an invite-only network for exceptional professionals. I think you'd be a great fit. Join here: ${referralLink}`,
      color: 'bg-[#25D366] hover:bg-[#128C7E]',
    },
    {
      platform: 'Email',
      icon: <Mail className="h-5 w-5" />,
      message: `Subject: Exclusive Invite to The Quantum Club\n\nHi [Name],\n\nI wanted to personally invite you to The Quantum Club, an exclusive talent network I'm part of. Given your background, I think you'd be a perfect fit.\n\nJoin here: ${referralLink}\n\nBest regards`,
      color: 'bg-primary hover:bg-primary/80',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="h-5 w-5" />
          Share Your Referral Link
        </CardTitle>
        <CardDescription>
          Earn €500 for each referral that gets hired. Share your unique link via any channel.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Referral Link */}
        <div className="space-y-2">
          <Label>Your Referral Link</Label>
          <div className="flex gap-2">
            <Input 
              value={referralLink} 
              readOnly 
              className="font-mono text-sm"
            />
            <Button 
              variant="outline" 
              onClick={() => copyToClipboard(referralLink)}
              className="flex-shrink-0"
            >
              {copied ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Custom Campaign Tag */}
        <div className="space-y-2">
          <Label>Custom Campaign Tag (optional)</Label>
          <Input 
            value={customTag}
            onChange={(e) => setCustomTag(e.target.value.replace(/[^a-zA-Z0-9-_]/g, ''))}
            placeholder="e.g., linkedin-post, email-campaign"
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Track which channels convert best by adding a custom tag
          </p>
        </div>

        {/* Quick Share Buttons */}
        <div className="space-y-2">
          <Label>Quick Share</Label>
          <div className="flex gap-2">
            <Button 
              onClick={shareViaLinkedIn}
              className="bg-[#0077B5] hover:bg-[#005885] text-white flex-1"
            >
              <Linkedin className="h-4 w-4 mr-2" />
              LinkedIn
            </Button>
            <Button 
              onClick={shareViaWhatsApp}
              className="bg-[#25D366] hover:bg-[#128C7E] text-white flex-1"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              WhatsApp
            </Button>
            <Button 
              onClick={shareViaEmail}
              className="flex-1"
            >
              <Mail className="h-4 w-4 mr-2" />
              Email
            </Button>
          </div>
        </div>

        {/* Message Templates */}
        <Tabs defaultValue="linkedin" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="linkedin">LinkedIn</TabsTrigger>
            <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
          </TabsList>
          {shareTemplates.map((template) => (
            <TabsContent 
              key={template.platform.toLowerCase()} 
              value={template.platform.toLowerCase()}
              className="mt-4"
            >
              <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {template.icon}
                  <span>Ready-to-share message</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{template.message}</p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => copyToClipboard(template.message)}
                >
                  <Copy className="h-3 w-3 mr-2" />
                  Copy Message
                </Button>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* QR Code Placeholder */}
        <div className="border rounded-lg p-6 text-center bg-muted/30">
          <QrCode className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            QR code for your referral link
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Perfect for networking events and business cards
          </p>
        </div>

        {/* Stats Preview */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold">12</div>
            <div className="text-xs text-muted-foreground">Link Clicks</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">5</div>
            <div className="text-xs text-muted-foreground">Sign Ups</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">42%</div>
            <div className="text-xs text-muted-foreground">Conversion</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
