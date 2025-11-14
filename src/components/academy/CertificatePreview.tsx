import { memo, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Award, Calendar, CheckCircle } from 'lucide-react';
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
  const [certificate, setCertificate] = useState<Certificate | null>(null);

  useEffect(() => {
    const fetchCertificate = async () => {
      const { data } = await supabase
        .from('certificates' as any)
        .select('*')
        .eq('id', certificateId)
        .single();
      
      if (data) setCertificate(data as any);
    };

    fetchCertificate();
  }, [certificateId]);

  if (!certificate) return null;

  return (
    <Card className="p-8 bg-gradient-to-br from-primary/5 to-background border-2 border-primary/20">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Award className="w-12 h-12 text-primary" />
          </div>
        </div>
        
        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Certificate of Completion
          </h3>
          <p className="text-2xl font-bold text-foreground mt-2">
            {certificate.metadata?.courseName || 'Course'}
          </p>
        </div>

        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {format(new Date(certificate.issued_at), 'MMM d, yyyy')}
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-primary" />
            Verified
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Certificate ID: {certificate.certificate_number}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Verify at: /certificates/verify/{certificate.verification_code}
          </p>
        </div>
      </div>
    </Card>
  );
});

CertificatePreview.displayName = 'CertificatePreview';
