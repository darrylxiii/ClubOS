import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Award, Calendar, CheckCircle, Share2, Linkedin, Copy, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

interface Certificate {
  certificate_number: string;
  issued_at: string;
  verification_code: string;
  metadata: any;
}

interface CertificatePreviewProps {
  certificateId: string;
}

export const CertificatePreview = memo<CertificatePreviewProps>(({ certificateId }) => {
  const { t } = useTranslation('common');
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchCertificate = async () => {
      const { data } = await supabase
        .from('certificates')
        .select('*')
        .eq('id', certificateId)
        .single();

      if (data) setCertificate(data as Certificate);
    };

    fetchCertificate();
  }, [certificateId]);

  if (!certificate) return null;

  const verifyUrl = `${window.location.origin}/certificates/verify/${certificate.verification_code}`;
  const courseName = certificate.metadata?.courseName || 'Course';

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(verifyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareLinkedIn = () => {
    const url = `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(courseName)}&organizationName=${encodeURIComponent('ClubOS Academy')}&certUrl=${encodeURIComponent(verifyUrl)}&certId=${encodeURIComponent(certificate.certificate_number)}`;
    window.open(url, '_blank');
  };

  return (
    <Card className="p-8 bg-gradient-to-br from-primary/5 to-background border-2 border-primary/20">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Award className="w-12 h-12 text-primary" />
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t('academy.certificateOfCompletion')}</h3>
          <p className="text-2xl font-bold text-foreground mt-2">{courseName}</p>
        </div>

        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {format(new Date(certificate.issued_at), 'MMM d, yyyy')}
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-primary" />
            {t('academy.verified')}
          </div>
        </div>

        {/* Share Actions */}
        <div className="flex items-center justify-center gap-2 pt-4 border-t border-border">
          <Button variant="outline" size="sm" onClick={handleShareLinkedIn}>
            <Linkedin className="h-4 w-4 mr-2" />
            Add to LinkedIn
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopyLink}>
            <Copy className="h-4 w-4 mr-2" />
            {copied ? "Copied!" : "Copy Link"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.open(verifyUrl, '_blank')}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Verify
          </Button>
        </div>

        <div className="pt-2">
          <p className="text-xs text-muted-foreground">
            {t('academy.certificateId')}: {certificate.certificate_number}
          </p>
        </div>
      </div>
    </Card>
  );
});

CertificatePreview.displayName = 'CertificatePreview';
