import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Download, Save, RefreshCw, FileText, Sparkles } from 'lucide-react';
import { CoverLetterTone } from '@/hooks/useCoverLetterGenerator';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';

interface CoverLetterPreviewProps {
  content: string;
  jobTitle: string;
  companyName: string;
  tone: CoverLetterTone;
  onContentChange: (content: string) => void;
  onRegenerate: () => void;
  onSave: () => void;
  onCopy: () => void;
  isRegenerating?: boolean;
  isSaving?: boolean;
}

export function CoverLetterPreview({
  content,
  jobTitle,
  companyName,
  tone,
  onContentChange,
  onRegenerate,
  onSave,
  onCopy,
  isRegenerating = false,
  isSaving = false,
}: CoverLetterPreviewProps) {
  const [isEditing, setIsEditing] = useState(false);

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const charCount = content.length;

  const toneLabels: Record<CoverLetterTone, { label: string; color: string }> = {
    professional: { label: 'Professional', color: 'bg-blue-500/20 text-blue-500' },
    conversational: { label: 'Conversational', color: 'bg-green-500/20 text-green-500' },
    executive: { label: 'Executive', color: 'bg-purple-500/20 text-purple-500' },
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      const margin = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      const maxWidth = pageWidth - margin * 2;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');

      // Split content into lines that fit the page width
      const lines = doc.splitTextToSize(content, maxWidth);
      
      let y = margin;
      const lineHeight = 6;
      const pageHeight = doc.internal.pageSize.getHeight();

      lines.forEach((line: string) => {
        if (y + lineHeight > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += lineHeight;
      });

      doc.save(`Cover Letter - ${companyName} - ${jobTitle}.pdf`);
      toast.success('PDF exported successfully!');
    } catch (err) {
      console.error('PDF export error:', err);
      toast.error('Failed to export PDF');
    }
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="w-5 h-5 text-primary" />
            Cover Letter Preview
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={toneLabels[tone].color}>
              {toneLabels[tone].label}
            </Badge>
            <Badge variant="outline" className="bg-primary/10 text-primary">
              <Sparkles className="w-3 h-3 mr-1" />
              QUIN Generated
            </Badge>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          For {jobTitle} at {companyName}
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {isEditing ? (
          <Textarea
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            className="min-h-[400px] font-mono text-sm leading-relaxed"
            placeholder="Your cover letter content..."
          />
        ) : (
          <div 
            className="min-h-[400px] p-4 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => setIsEditing(true)}
          >
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
              {content}
            </pre>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{wordCount} words • {charCount} characters</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? 'Preview' : 'Edit'}
          </Button>
        </div>
      </CardContent>

      <CardFooter className="flex flex-wrap gap-2 pt-4 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={onRegenerate}
          disabled={isRegenerating}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRegenerating ? 'animate-spin' : ''}`} />
          {isRegenerating ? 'Regenerating...' : 'Regenerate'}
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onCopy}
        >
          <Copy className="w-4 h-4 mr-2" />
          Copy
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportPDF}
        >
          <Download className="w-4 h-4 mr-2" />
          Export PDF
        </Button>
        
        <Button
          size="sm"
          onClick={onSave}
          disabled={isSaving}
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save to Documents'}
        </Button>
      </CardFooter>
    </Card>
  );
}
