import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ImportCandidatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ParsedCandidate {
  full_name: string;
  email?: string;
  phone?: string;
  current_role?: string;
  current_company?: string;
  isValid: boolean;
  errors: string[];
}

export function ImportCandidatesDialog({
  open,
  onOpenChange,
  onSuccess,
}: ImportCandidatesDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

  const parseCSV = useCallback((text: string): ParsedCandidate[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    const nameIdx = headers.findIndex(h => h.includes('name'));
    const emailIdx = headers.findIndex(h => h.includes('email'));
    const phoneIdx = headers.findIndex(h => h.includes('phone'));
    const roleIdx = headers.findIndex(h => h.includes('role') || h.includes('title'));
    const companyIdx = headers.findIndex(h => h.includes('company'));

    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const errors: string[] = [];

      const full_name = nameIdx >= 0 ? values[nameIdx] : '';
      const email = emailIdx >= 0 ? values[emailIdx] : undefined;

      if (!full_name) errors.push('Name is required');
      if (email && !email.includes('@')) errors.push('Invalid email format');

      return {
        full_name,
        email,
        phone: phoneIdx >= 0 ? values[phoneIdx] : undefined,
        current_role: roleIdx >= 0 ? values[roleIdx] : undefined,
        current_company: companyIdx >= 0 ? values[companyIdx] : undefined,
        isValid: errors.length === 0 && !!full_name,
        errors,
      };
    }).filter(c => c.full_name);
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsParsing(true);

    try {
      const text = await selectedFile.text();
      const parsed = parseCSV(text);
      setParsedData(parsed);
    } catch (error) {
      console.error('Parse error:', error);
      toast.error('Failed to parse file');
    } finally {
      setIsParsing(false);
    }
  }, [parseCSV]);

  const handleImport = async () => {
    const validCandidates = parsedData.filter(c => c.isValid);
    if (validCandidates.length === 0) {
      toast.error('No valid candidates to import');
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading(`Importing ${validCandidates.length} candidates...`);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Insert into candidate_profiles
      let imported = 0;
      for (const candidate of validCandidates) {
        const { error } = await supabase.from('candidate_profiles').insert({
          full_name: candidate.full_name,
          email: candidate.email || null,
          phone: candidate.phone || null,
          current_title: candidate.current_role || null,
          current_company: candidate.current_company || null,
          created_by: user.id,
          source_channel: 'csv_import',
        });

        if (!error) imported++;
      }

      toast.success(`Successfully imported ${imported} candidates`, { id: toastId });
      onSuccess();
      onOpenChange(false);
      setFile(null);
      setParsedData([]);
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import candidates', { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  const validCount = parsedData.filter(c => c.isValid).length;
  const invalidCount = parsedData.filter(c => !c.isValid).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Candidates
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file with candidate information. Required: Name. Optional: Email, Phone, Role, Company.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload */}
          <div className="space-y-2">
            <Label>CSV File</Label>
            <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload" className="cursor-pointer">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {file ? file.name : 'Click to upload or drag and drop'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  CSV files only
                </p>
              </label>
            </div>
          </div>

          {/* Parse Status */}
          {isParsing && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Parsing file...
            </div>
          )}

          {/* Preview */}
          {parsedData.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {validCount} valid
                </Badge>
                {invalidCount > 0 && (
                  <Badge variant="secondary" className="bg-red-500/10 text-red-500">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {invalidCount} with errors
                  </Badge>
                )}
              </div>

              <ScrollArea className="h-[200px] border rounded-lg">
                <div className="p-4 space-y-2">
                  {parsedData.slice(0, 20).map((candidate, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between p-2 rounded text-sm ${
                        candidate.isValid ? 'bg-muted/50' : 'bg-red-500/10'
                      }`}
                    >
                      <div>
                        <span className="font-medium">{candidate.full_name}</span>
                        {candidate.email && (
                          <span className="text-muted-foreground ml-2">({candidate.email})</span>
                        )}
                      </div>
                      {!candidate.isValid && (
                        <span className="text-red-500 text-xs">{candidate.errors.join(', ')}</span>
                      )}
                    </div>
                  ))}
                  {parsedData.length > 20 && (
                    <p className="text-xs text-muted-foreground text-center">
                      ...and {parsedData.length - 20} more
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={isLoading || validCount === 0}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>Import {validCount} Candidates</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
