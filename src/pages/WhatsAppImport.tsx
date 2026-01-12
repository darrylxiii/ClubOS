import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Upload, FileText, Users, Calendar, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { SectionLoader, InlineLoader } from "@/components/ui/unified-loader";
import { AppLayout } from '@/components/AppLayout';
import { RoleGate } from '@/components/RoleGate';

export default function WhatsAppImport() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [importResult, setImportResult] = useState<any>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    if (!selectedFile.name.endsWith('.txt') && !selectedFile.name.endsWith('.zip')) {
      toast.error('Please select a .txt or .zip file');
      return;
    }

    setFile(selectedFile);

    // Preview first few lines
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const lines = content.split('\n').slice(0, 10);

      // Parse a few messages for preview
      const messages: any[] = [];
      for (const line of lines) {
        const match = line.match(/^\[?(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AP]M)?)\]?\s*[-:]?\s*([^:]+):\s*(.+)$/i);
        if (match) {
          messages.push({
            date: match[1],
            time: match[2],
            sender: match[3].trim(),
            content: match[4].trim(),
          });
        }
      }

      setPreview({ total_lines: lines.length, messages });
    };
    reader.readAsText(selectedFile);

    // Load companies
    const { data } = await supabase
      .from('companies')
      .select('id, name')
      .order('name');
    setCompanies(data || []);

    setStep(2);
  };

  const handleUpload = async () => {
    if (!file || !selectedCompanyId) {
      toast.error('Please select a file and company');
      return;
    }

    setUploading(true);
    try {
      // Upload file to storage
      const fileName = `whatsapp-imports/${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('interactions')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('interactions')
        .getPublicUrl(fileName);

      // Create import record
      const { data: importRecord, error: importError } = await (supabase as any)
        .from('whatsapp_imports')
        .insert({
          company_id: selectedCompanyId,
          uploaded_by: user?.id,
          filename: file.name,
          file_url: publicUrl,
          status: 'pending',
        })
        .select()
        .single();

      if (importError) throw importError;

      setStep(3);
      setParsing(true);

      // Start parsing
      const { data: parseResult, error: parseError } = await supabase.functions.invoke(
        'parse-whatsapp-chat',
        {
          body: {
            file_url: publicUrl,
            company_id: selectedCompanyId,
            import_id: importRecord.id,
          },
        }
      );

      if (parseError) throw parseError;

      setImportResult(parseResult);
      setParsing(false);
      setStep(4);
      toast.success('WhatsApp chat imported successfully!');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to import chat');
      setParsing(false);
    } finally {
      setUploading(false);
    }
  };

  return (
    <AppLayout>
      <RoleGate allowedRoles={['admin', 'strategist']}>
        <div className="container mx-auto py-8 max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Import WhatsApp Chat</h1>
            <p className="text-muted-foreground">Upload a WhatsApp chat export to track company interactions</p>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className={`flex items-center gap-2 ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  1
                </div>
                <span className="font-medium">Upload File</span>
              </div>
              <div className="flex-1 h-1 mx-4 bg-muted">
                <div className={`h-full bg-primary transition-all ${step >= 2 ? 'w-full' : 'w-0'}`} />
              </div>
              <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  2
                </div>
                <span className="font-medium">Select Company</span>
              </div>
              <div className="flex-1 h-1 mx-4 bg-muted">
                <div className={`h-full bg-primary transition-all ${step >= 3 ? 'w-full' : 'w-0'}`} />
              </div>
              <div className={`flex items-center gap-2 ${step >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  3
                </div>
                <span className="font-medium">Processing</span>
              </div>
            </div>
          </div>

          {/* Step 1: Upload */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Upload WhatsApp Export</CardTitle>
                <CardDescription>
                  Export your WhatsApp chat and upload the .txt file here
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="border-2 border-dashed rounded-lg p-12 text-center">
                    <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <Label htmlFor="file-upload" className="cursor-pointer">
                      <span className="text-lg font-medium">Choose a file</span>
                      <p className="text-sm text-muted-foreground mt-2">
                        .txt or .zip files only
                      </p>
                    </Label>
                    <Input
                      id="file-upload"
                      type="file"
                      accept=".txt,.zip"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-medium mb-2">How to export from WhatsApp:</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Open the WhatsApp chat you want to export</li>
                      <li>Tap the three dots (⋮) menu</li>
                      <li>Select "More" → "Export chat"</li>
                      <li>Choose "Without Media"</li>
                      <li>Save the .txt file and upload it here</li>
                    </ol>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Preview & Company Selection */}
          {step === 2 && preview && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Chat Preview</CardTitle>
                  <CardDescription>Preview of the first few messages</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {preview.messages.map((msg: any, idx: number) => (
                      <div key={idx} className="p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{msg.sender}</span>
                          <span className="text-xs text-muted-foreground">{msg.date} {msg.time}</span>
                        </div>
                        <p className="text-sm">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Select Company</CardTitle>
                  <CardDescription>Which company is this conversation about?</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Company</Label>
                    <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select company" />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map(company => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={handleUpload}
                      disabled={!selectedCompanyId || uploading}
                      className="flex-1"
                      aria-busy={uploading}
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          <span className="sr-only">Import in progress</span>
                          Import Chat
                        </>
                      ) : (
                        'Import Chat'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 3: Processing */}
          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Processing Chat</CardTitle>
                <CardDescription>Parsing messages and resolving participants...</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <SectionLoader />
                  <div className="flex-1">
                    <p className="font-medium">Analyzing messages</p>
                    <p className="text-sm text-muted-foreground">
                      This may take a minute for large conversations
                    </p>
                  </div>
                </div>
                <Progress value={undefined} className="w-full" />
              </CardContent>
            </Card>
          )}

          {/* Step 4: Complete */}
          {step === 4 && importResult && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                  <CardTitle>Import Complete!</CardTitle>
                </div>
                <CardDescription>Your WhatsApp chat has been successfully imported</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <FileText className="h-8 w-8 mb-2 text-primary" />
                    <div className="text-2xl font-bold">{importResult.total_messages}</div>
                    <div className="text-sm text-muted-foreground">Messages</div>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <Users className="h-8 w-8 mb-2 text-primary" />
                    <div className="text-2xl font-bold">{importResult.participants_detected?.length || 0}</div>
                    <div className="text-sm text-muted-foreground">Participants</div>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <Calendar className="h-8 w-8 mb-2 text-primary" />
                    <div className="text-2xl font-bold">
                      {new Date(importResult.date_range.start).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-muted-foreground">to {new Date(importResult.date_range.end).toLocaleDateString()}</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => navigate(`/companies/${selectedCompanyId}/intelligence`)}
                    className="flex-1"
                  >
                    View Company Intelligence
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStep(1);
                      setFile(null);
                      setPreview(null);
                      setImportResult(null);
                    }}
                    className="flex-1"
                  >
                    Import Another
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </RoleGate>
    </AppLayout>
  );
}
