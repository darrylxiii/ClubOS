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
import { Upload, FileText, Users, Calendar, CheckCircle, Loader2, History } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

export function WhatsAppImportTab() {
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

  // Fetch previous imports
  const { data: previousImports } = useQuery({
    queryKey: ['whatsapp-imports'],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('whatsapp_imports')
        .select('*, companies(name)')
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.txt') && !selectedFile.name.endsWith('.zip')) {
      toast.error('Please select a .txt or .zip file');
      return;
    }

    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const lines = content.split('\n').slice(0, 10);
      
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
      const fileName = `whatsapp-imports/${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('interactions')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('interactions')
        .getPublicUrl(fileName);

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

  const resetImport = () => {
    setStep(1);
    setFile(null);
    setPreview(null);
    setImportResult(null);
    setSelectedCompanyId('');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold">Import WhatsApp Chat</h2>
        <p className="text-sm text-muted-foreground">Upload a WhatsApp chat export to track company interactions</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {[
          { num: 1, label: 'Upload File' },
          { num: 2, label: 'Select Company' },
          { num: 3, label: 'Processing' },
        ].map((s, idx) => (
          <div key={s.num} className="flex items-center">
            <div className={`flex items-center gap-2 ${step >= s.num ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= s.num ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                {s.num}
              </div>
              <span className="font-medium hidden sm:block">{s.label}</span>
            </div>
            {idx < 2 && (
              <div className="flex-1 h-1 mx-4 bg-muted min-w-[40px]">
                <div className={`h-full bg-primary transition-all ${step > s.num ? 'w-full' : 'w-0'}`} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload WhatsApp Export</CardTitle>
              <CardDescription>Export your WhatsApp chat and upload the .txt file</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                <Label htmlFor="file-upload" className="cursor-pointer">
                  <span className="text-lg font-medium">Choose a file</span>
                  <p className="text-sm text-muted-foreground mt-2">.txt or .zip files only</p>
                </Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".txt,.zip"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              <div className="bg-muted p-4 rounded-lg mt-4">
                <h4 className="font-medium mb-2 text-sm">How to export from WhatsApp:</h4>
                <ol className="list-decimal list-inside space-y-1 text-xs text-muted-foreground">
                  <li>Open the WhatsApp chat you want to export</li>
                  <li>Tap the three dots (⋮) menu</li>
                  <li>Select "More" → "Export chat"</li>
                  <li>Choose "Without Media"</li>
                  <li>Save the .txt file and upload it here</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          {/* Previous Imports */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Recent Imports
              </CardTitle>
            </CardHeader>
            <CardContent>
              {previousImports && previousImports.length > 0 ? (
                <div className="space-y-3">
                  {previousImports.slice(0, 5).map((imp: any) => (
                    <div key={imp.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="min-w-0">
                        <p className="font-medium truncate text-sm">{imp.filename}</p>
                        <p className="text-xs text-muted-foreground">
                          {imp.companies?.name} • {format(new Date(imp.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs ${
                        imp.status === 'completed' ? 'bg-green-500/10 text-green-500' :
                        imp.status === 'failed' ? 'bg-red-500/10 text-red-500' :
                        'bg-amber-500/10 text-amber-500'
                      }`}>
                        {imp.status}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8 text-sm">
                  No previous imports
                </p>
              )}
            </CardContent>
          </Card>
        </div>
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
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {preview.messages.map((msg: any, idx: number) => (
                  <div key={idx} className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{msg.sender}</span>
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
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Back
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={!selectedCompanyId || uploading}
                  className="flex-1"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
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
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
              <div className="p-4 bg-muted rounded-lg text-center">
                <FileText className="h-8 w-8 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">{importResult.total_messages}</div>
                <div className="text-sm text-muted-foreground">Messages</div>
              </div>
              <div className="p-4 bg-muted rounded-lg text-center">
                <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">{importResult.participants_detected?.length || 0}</div>
                <div className="text-sm text-muted-foreground">Participants</div>
              </div>
              <div className="p-4 bg-muted rounded-lg text-center">
                <Calendar className="h-8 w-8 mx-auto mb-2 text-primary" />
                <div className="text-lg font-bold">
                  {new Date(importResult.date_range?.start).toLocaleDateString()}
                </div>
                <div className="text-sm text-muted-foreground">
                  to {new Date(importResult.date_range?.end).toLocaleDateString()}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => navigate(`/companies/${selectedCompanyId}/intelligence`)}
                className="flex-1"
              >
                View Company Intelligence
              </Button>
              <Button variant="outline" onClick={resetImport} className="flex-1">
                Import Another
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
