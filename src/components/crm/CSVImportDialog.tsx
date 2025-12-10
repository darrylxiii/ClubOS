import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, FileSpreadsheet, Check, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { INSTANTLY_FIELD_MAPPINGS } from '@/types/crm-enterprise';

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: () => void;
}

type ImportStep = 'upload' | 'mapping' | 'options' | 'importing' | 'complete';

interface ParsedCSV {
  headers: string[];
  rows: Record<string, string>[];
  fileName: string;
}

const TARGET_FIELDS = [
  { value: 'email', label: 'Email', required: true },
  { value: 'first_name', label: 'First Name' },
  { value: 'last_name', label: 'Last Name' },
  { value: 'company_name', label: 'Company Name' },
  { value: 'company_domain', label: 'Company Domain' },
  { value: 'title', label: 'Job Title' },
  { value: 'phone', label: 'Phone' },
  { value: 'linkedin_url', label: 'LinkedIn URL' },
  { value: 'location', label: 'Location' },
  { value: 'country', label: 'Country' },
  { value: 'industry', label: 'Industry' },
  { value: 'company_size', label: 'Company Size' },
  { value: 'sent_count', label: 'Emails Sent' },
  { value: 'open_count', label: 'Opens' },
  { value: 'reply_count', label: 'Replies' },
  { value: 'bounced', label: 'Bounced' },
  { value: 'unsubscribed', label: 'Unsubscribed' },
  { value: 'skip', label: '— Skip this column —' },
];

export function CSVImportDialog({ open, onOpenChange, onImportComplete }: CSVImportDialogProps) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [parsedCSV, setParsedCSV] = useState<ParsedCSV | null>(null);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [campaignName, setCampaignName] = useState('');
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{
    total: number;
    imported: number;
    skipped: number;
    failed: number;
    duplicates: number;
    errors: { row: number; email: string; error: string }[];
  } | null>(null);
  const { toast } = useToast();

  const parseCSV = (content: string): { headers: string[]; rows: Record<string, string>[] } => {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV must have a header row and at least one data row');
    }

    // Parse header
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

    // Parse rows
    const rows: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      rows.push(row);
    }

    return { headers, rows };
  };

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a CSV file',
        variant: 'destructive',
      });
      return;
    }

    try {
      const content = await file.text();
      const { headers, rows } = parseCSV(content);

      setParsedCSV({ headers, rows, fileName: file.name });

      // Auto-map fields based on Instantly field names
      const autoMapping: Record<string, string> = {};
      headers.forEach(header => {
        const mapped = INSTANTLY_FIELD_MAPPINGS[header];
        if (mapped) {
          autoMapping[header] = mapped;
        }
      });
      setFieldMapping(autoMapping);

      // Auto-generate campaign name from filename
      const baseName = file.name.replace('.csv', '').replace(/_/g, ' ');
      setCampaignName(`${baseName} - ${new Date().toLocaleDateString()}`);

      setStep('mapping');
    } catch (err) {
      console.error('Error parsing CSV:', err);
      toast({
        title: 'Error parsing CSV',
        description: err instanceof Error ? err.message : 'Invalid CSV format',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const handleImport = async () => {
    if (!parsedCSV) return;

    // Validate email mapping
    const emailColumn = Object.keys(fieldMapping).find(k => fieldMapping[k] === 'email');
    if (!emailColumn) {
      toast({
        title: 'Email field required',
        description: 'Please map at least one column to Email',
        variant: 'destructive',
      });
      return;
    }

    setImporting(true);
    setImportProgress(10);
    setStep('importing');

    try {
      // Transform rows to prospect format
      const prospects = parsedCSV.rows.map(row => {
        const prospect: Record<string, any> = {};
        Object.entries(fieldMapping).forEach(([csvColumn, targetField]) => {
          if (targetField !== 'skip' && row[csvColumn]) {
            prospect[targetField] = row[csvColumn];
          }
        });
        return prospect;
      });

      setImportProgress(30);

      // Call import edge function
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('import-instantly-campaign', {
        body: {
          campaign_name: campaignName,
          prospects,
          field_mapping: fieldMapping,
          skip_duplicates: skipDuplicates,
          update_existing: updateExisting,
        },
      });

      setImportProgress(90);

      if (response.error) throw response.error;

      setImportResult(response.data.stats);
      setImportProgress(100);
      setStep('complete');

      toast({
        title: 'Import complete',
        description: `Imported ${response.data.stats.imported} of ${response.data.stats.total} prospects`,
      });

      onImportComplete?.();
    } catch (err) {
      console.error('Import error:', err);
      toast({
        title: 'Import failed',
        description: err instanceof Error ? err.message : 'Failed to import prospects',
        variant: 'destructive',
      });
      setStep('options');
    } finally {
      setImporting(false);
    }
  };

  const resetDialog = () => {
    setStep('upload');
    setParsedCSV(null);
    setFieldMapping({});
    setCampaignName('');
    setSkipDuplicates(true);
    setUpdateExisting(false);
    setImportProgress(0);
    setImportResult(null);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      resetDialog();
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Import from Instantly.ai
          </DialogTitle>
          <DialogDescription>
            Upload your Instantly.ai campaign export CSV to import prospects
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 py-4">
          {['upload', 'mapping', 'options', 'importing'].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                step === s ? 'bg-primary text-primary-foreground' :
                ['mapping', 'options', 'importing', 'complete'].indexOf(step) > i ? 'bg-primary/20 text-primary' :
                'bg-muted text-muted-foreground'
              }`}>
                {['mapping', 'options', 'importing', 'complete'].indexOf(step) > i ? (
                  <Check className="h-4 w-4" />
                ) : (
                  i + 1
                )}
              </div>
              {i < 3 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {/* Upload Step */}
        {step === 'upload' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Drag and drop your CSV file here, or click to browse
              </p>
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="max-w-xs mx-auto"
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Supported: Instantly.ai campaign exports, standard CSV format
            </p>
          </motion.div>
        )}

        {/* Mapping Step */}
        {step === 'mapping' && parsedCSV && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{parsedCSV.fileName}</p>
                <p className="text-sm text-muted-foreground">
                  {parsedCSV.rows.length} rows, {parsedCSV.headers.length} columns
                </p>
              </div>
              <Badge variant="outline">
                {Object.values(fieldMapping).filter(v => v !== 'skip').length} mapped
              </Badge>
            </div>

            <ScrollArea className="h-[300px] border rounded-lg p-4">
              <div className="space-y-3">
                {parsedCSV.headers.map(header => (
                  <div key={header} className="flex items-center gap-4">
                    <div className="w-1/3">
                      <p className="text-sm font-medium truncate" title={header}>
                        {header}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {parsedCSV.rows[0]?.[header] || '(empty)'}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <Select
                      value={fieldMapping[header] || 'skip'}
                      onValueChange={value => setFieldMapping(prev => ({ ...prev, [header]: value }))}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        {TARGET_FIELDS.map(field => (
                          <SelectItem key={field.value} value={field.value}>
                            {field.label}
                            {field.required && <span className="text-destructive ml-1">*</span>}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button onClick={() => setStep('options')}>
                Continue
              </Button>
            </div>
          </motion.div>
        )}

        {/* Options Step */}
        {step === 'options' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <Label htmlFor="campaignName">Campaign Name</Label>
              <Input
                id="campaignName"
                value={campaignName}
                onChange={e => setCampaignName(e.target.value)}
                placeholder="Enter campaign name"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="skipDuplicates"
                  checked={skipDuplicates}
                  onCheckedChange={checked => setSkipDuplicates(checked as boolean)}
                />
                <Label htmlFor="skipDuplicates" className="font-normal">
                  Skip duplicate emails (already in system)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="updateExisting"
                  checked={updateExisting}
                  onCheckedChange={checked => setUpdateExisting(checked as boolean)}
                  disabled={skipDuplicates}
                />
                <Label htmlFor="updateExisting" className="font-normal">
                  Update existing prospects with new data
                </Label>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Import Summary</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• {parsedCSV?.rows.length || 0} prospects to import</li>
                <li>• {Object.values(fieldMapping).filter(v => v !== 'skip').length} fields mapped</li>
                <li>• Campaign: {campaignName || 'Unnamed'}</li>
              </ul>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('mapping')}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={!campaignName}>
                Start Import
              </Button>
            </div>
          </motion.div>
        )}

        {/* Importing Step */}
        {step === 'importing' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 py-8"
          >
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <p className="font-medium">Importing prospects...</p>
              <p className="text-sm text-muted-foreground">
                This may take a moment
              </p>
            </div>
            <Progress value={importProgress} className="h-2" />
          </motion.div>
        )}

        {/* Complete Step */}
        {step === 'complete' && importResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center py-4">
              <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-green-500" />
              </div>
              <p className="text-xl font-semibold">Import Complete!</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-primary">{importResult.imported}</p>
                <p className="text-sm text-muted-foreground">Imported</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold">{importResult.total}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-yellow-500">{importResult.duplicates}</p>
                <p className="text-sm text-muted-foreground">Duplicates</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-destructive">{importResult.failed}</p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="bg-destructive/10 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <p className="font-medium text-sm">Errors ({importResult.errors.length})</p>
                </div>
                <ScrollArea className="h-[100px]">
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {importResult.errors.slice(0, 10).map((err, i) => (
                      <li key={i}>
                        Row {err.row}: {err.email} - {err.error}
                      </li>
                    ))}
                    {importResult.errors.length > 10 && (
                      <li>...and {importResult.errors.length - 10} more</li>
                    )}
                  </ul>
                </ScrollArea>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={() => handleClose(false)}>
                Done
              </Button>
            </div>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
}
