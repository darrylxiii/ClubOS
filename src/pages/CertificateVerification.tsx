import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MinimalHeader } from '@/components/MinimalHeader';
import { Award, CheckCircle, Download, XCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function CertificateVerification() {
  const { code } = useParams<{ code: string }>();
  const [certificate, setCertificate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyCertificate = async () => {
      if (!code) {
        setError('No verification code provided');
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('certificates' as any)
          .select(`
            *,
            courses (
              title,
              thumbnail_url
            )
          `)
          .eq('verification_code', code)
          .single();

        if (fetchError) throw fetchError;

        if (!data) {
          setError('Certificate not found');
        } else {
          setCertificate(data as any);
        }
      } catch (err) {
        console.error('Error verifying certificate:', err);
        setError('Invalid certificate code');
      } finally {
        setLoading(false);
      }
    };

    verifyCertificate();
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <MinimalHeader backPath="/" />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <MinimalHeader backPath="/" />
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="w-12 h-12 text-destructive" />
              </div>
            </div>
            <h1 className="text-2xl font-bold mb-2">Certificate Not Found</h1>
            <p className="text-muted-foreground">{error}</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background to-muted/20">
      <MinimalHeader backPath="/" />
      <div className="flex-1 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full p-8 md:p-12">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
              <Award className="w-16 h-16 text-primary" />
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-primary">
            <CheckCircle className="w-5 h-5" />
            <span className="font-semibold">Verified Certificate</span>
          </div>

          <div>
            <h1 className="text-3xl font-bold mb-2">Certificate of Completion</h1>
            <p className="text-xl text-muted-foreground">{certificate.courses?.title}</p>
          </div>

          <div className="grid gap-4 py-6 border-y border-border">
            <div>
              <p className="text-sm text-muted-foreground">Certificate Number</p>
              <p className="font-mono text-lg">{certificate.certificate_number}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Issued On</p>
              <p className="text-lg">{format(new Date(certificate.issued_at), 'MMMM d, yyyy')}</p>
            </div>
            {certificate.metadata?.skills && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Skills Demonstrated</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {certificate.metadata.skills.map((skill: string, i: number) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This certificate verifies that the holder has successfully completed the course requirements.
            </p>
            
            {certificate.pdf_url && (
              <Button className="w-full" size="lg">
                <Download className="w-4 h-4 mr-2" />
                Download Certificate
              </Button>
            )}
          </div>
        </div>
      </Card>
      </div>
    </div>
  );
}
