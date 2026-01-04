import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Copy, QrCode, Twitter, Linkedin, Send, Check } from 'lucide-react';
import { notify } from '@/lib/notify';
import QRCode from 'qrcode';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareUrl: string;
  shareText: string;
  onShare: (platform?: string) => void;
}

export function ShareDialog({ open, onOpenChange, shareUrl, shareText, onShare }: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  useEffect(() => {
    if (showQR && !qrCodeUrl) {
      generateQRCode();
    }
  }, [showQR]);

  const generateQRCode = async () => {
    try {
      const url = await QRCode.toDataURL(shareUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#0E0E10',
          light: '#FFFFFF',
        },
      });
      setQrCodeUrl(url);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      notify.success("Link copied to clipboard");
      onShare('copy');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      notify.error("Failed to copy");
    }
  };

  const handleSocialShare = (platform: 'twitter' | 'linkedin' | 'whatsapp') => {
    if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
    } else if (platform === 'linkedin') {
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank');
    } else if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`, '_blank');
    }
    onShare(platform);
    onOpenChange(false);
  };

  const downloadQR = () => {
    if (!qrCodeUrl) return;
    const link = document.createElement('a');
    link.download = 'post-qr-code.png';
    link.href = qrCodeUrl;
    link.click();
    notify.success("QR code downloaded");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share this post</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Copy Link */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Link</label>
            <div className="flex gap-2">
              <Input value={shareUrl} readOnly className="flex-1" />
              <Button size="icon" variant="outline" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <Separator />

          {/* Social Platforms */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Share to</label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                className="flex flex-col gap-2 h-auto py-4"
                onClick={() => handleSocialShare('twitter')}
              >
                <Twitter className="h-5 w-5" />
                <span className="text-xs">Twitter</span>
              </Button>
              <Button
                variant="outline"
                className="flex flex-col gap-2 h-auto py-4"
                onClick={() => handleSocialShare('linkedin')}
              >
                <Linkedin className="h-5 w-5" />
                <span className="text-xs">LinkedIn</span>
              </Button>
              <Button
                variant="outline"
                className="flex flex-col gap-2 h-auto py-4"
                onClick={() => handleSocialShare('whatsapp')}
              >
                <Send className="h-5 w-5" />
                <span className="text-xs">WhatsApp</span>
              </Button>
            </div>
          </div>

          <Separator />

          {/* QR Code */}
          <div className="space-y-2">
            <label className="text-sm font-medium">QR Code</label>
            {!showQR ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowQR(true)}
              >
                <QrCode className="h-4 w-4 mr-2" />
                Generate QR Code
              </Button>
            ) : qrCodeUrl ? (
              <div className="flex flex-col items-center gap-3 p-4 border rounded-lg">
                <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
                <Button size="sm" onClick={downloadQR}>
                  Download QR Code
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
