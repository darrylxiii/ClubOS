import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, Code, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTemplates, CreateTemplateParams } from '@/hooks/useTemplates';

interface NotionImporterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport?: (content: any[], metadata: { name: string; description?: string; category?: string }) => void;
}

const TEMPLATE_CATEGORIES = [
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'meeting-notes', label: 'Meeting Notes' },
  { value: 'project', label: 'Project Management' },
  { value: 'recruitment', label: 'Recruitment' },
  { value: 'documentation', label: 'Documentation' },
  { value: 'custom', label: 'Custom' },
];

export function NotionImporter({ open, onOpenChange, onImport }: NotionImporterProps) {
  const [importType, setImportType] = useState<'markdown' | 'html'>('markdown');
  const [rawContent, setRawContent] = useState('');
  const [parsedBlocks, setParsedBlocks] = useState<any[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Template metadata
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateCategory, setTemplateCategory] = useState('custom');
  const [templateIcon, setTemplateIcon] = useState('📄');
  const [visibility, setVisibility] = useState<'system' | 'company' | 'personal'>('system');

  const { createTemplate } = useTemplates();

  // Convert Markdown to BlockNote blocks
  const parseMarkdown = useCallback((markdown: string): any[] => {
    const lines = markdown.split('\n');
    const blocks: any[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip empty lines
      if (!line.trim()) continue;

      // Headings
      if (line.startsWith('### ')) {
        blocks.push({
          type: 'heading',
          props: { level: 3 },
          content: [{ type: 'text', text: line.slice(4).trim(), styles: {} }],
        });
      } else if (line.startsWith('## ')) {
        blocks.push({
          type: 'heading',
          props: { level: 2 },
          content: [{ type: 'text', text: line.slice(3).trim(), styles: {} }],
        });
      } else if (line.startsWith('# ')) {
        blocks.push({
          type: 'heading',
          props: { level: 1 },
          content: [{ type: 'text', text: line.slice(2).trim(), styles: {} }],
        });
      }
      // Bullet lists
      else if (line.match(/^[\-\*]\s/)) {
        blocks.push({
          type: 'bulletListItem',
          content: [{ type: 'text', text: line.slice(2).trim(), styles: {} }],
        });
      }
      // Numbered lists
      else if (line.match(/^\d+\.\s/)) {
        blocks.push({
          type: 'numberedListItem',
          content: [{ type: 'text', text: line.replace(/^\d+\.\s/, '').trim(), styles: {} }],
        });
      }
      // Checkboxes
      else if (line.match(/^[\-\*]\s\[[ x]\]/i)) {
        const checked = line.includes('[x]') || line.includes('[X]');
        blocks.push({
          type: 'checkListItem',
          props: { checked },
          content: [{ type: 'text', text: line.replace(/^[\-\*]\s\[[ x]\]\s?/i, '').trim(), styles: {} }],
        });
      }
      // Code blocks
      else if (line.startsWith('```')) {
        const language = line.slice(3).trim() || 'text';
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        blocks.push({
          type: 'codeBlock',
          props: { language },
          content: [{ type: 'text', text: codeLines.join('\n'), styles: {} }],
        });
      }
      // Blockquotes
      else if (line.startsWith('> ')) {
        blocks.push({
          type: 'paragraph',
          props: { textColor: 'gray' },
          content: [{ type: 'text', text: line.slice(2).trim(), styles: { italic: true } }],
        });
      }
      // Horizontal rule
      else if (line.match(/^[-_*]{3,}$/)) {
        // BlockNote doesn't have HR, skip or convert to empty paragraph
        continue;
      }
      // Regular paragraph
      else {
        // Parse inline formatting
        let text = line.trim();
        const content: any[] = [];
        
        // Simple text for now - could enhance with bold/italic parsing
        content.push({ type: 'text', text, styles: {} });
        
        blocks.push({
          type: 'paragraph',
          content,
        });
      }
    }

    return blocks;
  }, []);

  // Parse HTML to BlockNote blocks
  const parseHTML = useCallback((html: string): any[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const blocks: any[] = [];

    const processNode = (node: Element) => {
      const tagName = node.tagName.toLowerCase();
      const textContent = node.textContent?.trim() || '';

      switch (tagName) {
        case 'h1':
          blocks.push({
            type: 'heading',
            props: { level: 1 },
            content: [{ type: 'text', text: textContent, styles: {} }],
          });
          break;
        case 'h2':
          blocks.push({
            type: 'heading',
            props: { level: 2 },
            content: [{ type: 'text', text: textContent, styles: {} }],
          });
          break;
        case 'h3':
          blocks.push({
            type: 'heading',
            props: { level: 3 },
            content: [{ type: 'text', text: textContent, styles: {} }],
          });
          break;
        case 'p':
          if (textContent) {
            blocks.push({
              type: 'paragraph',
              content: [{ type: 'text', text: textContent, styles: {} }],
            });
          }
          break;
        case 'ul':
          node.querySelectorAll(':scope > li').forEach((li) => {
            blocks.push({
              type: 'bulletListItem',
              content: [{ type: 'text', text: li.textContent?.trim() || '', styles: {} }],
            });
          });
          break;
        case 'ol':
          node.querySelectorAll(':scope > li').forEach((li) => {
            blocks.push({
              type: 'numberedListItem',
              content: [{ type: 'text', text: li.textContent?.trim() || '', styles: {} }],
            });
          });
          break;
        case 'blockquote':
          blocks.push({
            type: 'paragraph',
            props: { textColor: 'gray' },
            content: [{ type: 'text', text: textContent, styles: { italic: true } }],
          });
          break;
        case 'pre':
        case 'code':
          blocks.push({
            type: 'codeBlock',
            props: { language: 'text' },
            content: [{ type: 'text', text: textContent, styles: {} }],
          });
          break;
        case 'div':
        case 'article':
        case 'section':
          // Process children
          node.children && Array.from(node.children).forEach(processNode);
          break;
      }
    };

    Array.from(doc.body.children).forEach(processNode);
    return blocks;
  }, []);

  const handleParse = () => {
    if (!rawContent.trim()) {
      setParseError('Please paste some content to import');
      return;
    }

    setIsProcessing(true);
    setParseError(null);

    try {
      const blocks = importType === 'markdown' 
        ? parseMarkdown(rawContent) 
        : parseHTML(rawContent);

      if (blocks.length === 0) {
        setParseError('No content could be parsed. Please check the format.');
        setParsedBlocks(null);
      } else {
        setParsedBlocks(blocks);
        
        // Auto-extract title from first heading
        const firstHeading = blocks.find(b => b.type === 'heading');
        if (firstHeading && !templateName) {
          setTemplateName(firstHeading.content?.[0]?.text || 'Imported Template');
        }
      }
    } catch (error) {
      setParseError('Failed to parse content. Please check the format.');
      console.error('Parse error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!parsedBlocks || !templateName.trim()) {
      toast.error('Please parse content and provide a template name');
      return;
    }

    try {
      await createTemplate.mutateAsync({
        name: templateName,
        description: templateDescription || undefined,
        icon: templateIcon,
        content: parsedBlocks,
        category: templateCategory,
        visibility,
        source_type: 'notion',
      });

      // Reset form
      setRawContent('');
      setParsedBlocks(null);
      setTemplateName('');
      setTemplateDescription('');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save template:', error);
    }
  };

  const handleUseDirectly = () => {
    if (!parsedBlocks) return;
    
    onImport?.(parsedBlocks, {
      name: templateName || 'Imported Page',
      description: templateDescription,
      category: templateCategory,
    });
    
    onOpenChange(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRawContent(content);
      
      // Auto-detect file type
      if (file.name.endsWith('.html') || file.name.endsWith('.htm')) {
        setImportType('html');
      } else {
        setImportType('markdown');
      }
    };
    reader.readAsText(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Import from Notion
          </DialogTitle>
          <DialogDescription>
            Paste your Notion export (Markdown or HTML) to convert it into a template
          </DialogDescription>
        </DialogHeader>

        <Tabs value={importType} onValueChange={(v) => setImportType(v as 'markdown' | 'html')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="markdown" className="gap-2">
              <FileText className="h-4 w-4" />
              Markdown
            </TabsTrigger>
            <TabsTrigger value="html" className="gap-2">
              <Code className="h-4 w-4" />
              HTML
            </TabsTrigger>
          </TabsList>

          <TabsContent value="markdown" className="space-y-4">
            <div className="space-y-2">
              <Label>Paste Markdown Content</Label>
              <Textarea
                value={rawContent}
                onChange={(e) => setRawContent(e.target.value)}
                placeholder="# My Notion Page&#10;&#10;Paste your exported Markdown here..."
                className="min-h-[200px] font-mono text-sm"
              />
            </div>
          </TabsContent>

          <TabsContent value="html" className="space-y-4">
            <div className="space-y-2">
              <Label>Paste HTML Content</Label>
              <Textarea
                value={rawContent}
                onChange={(e) => setRawContent(e.target.value)}
                placeholder="<h1>My Notion Page</h1>&#10;<p>Paste your exported HTML here...</p>"
                className="min-h-[200px] font-mono text-sm"
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* File Upload */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <input
              type="file"
              accept=".md,.markdown,.html,.htm,.txt"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Button variant="outline" size="sm" className="gap-2">
              <Upload className="h-4 w-4" />
              Upload File
            </Button>
          </div>
          <span className="text-sm text-muted-foreground">
            or drag & drop .md or .html files
          </span>
        </div>

        {/* Parse Button */}
        <Button onClick={handleParse} disabled={!rawContent.trim() || isProcessing}>
          {isProcessing ? 'Processing...' : 'Parse Content'}
        </Button>

        {/* Parse Error */}
        {parseError && (
          <Card className="p-4 border-destructive bg-destructive/10">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{parseError}</span>
            </div>
          </Card>
        )}

        {/* Parsed Preview */}
        {parsedBlocks && (
          <div className="space-y-4">
            <Card className="p-4 border-green-500/50 bg-green-500/10">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Successfully parsed {parsedBlocks.length} blocks
                </span>
              </div>
            </Card>

            {/* Template Metadata */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Name *</Label>
                <Input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="My Template"
                />
              </div>
              <div className="space-y-2">
                <Label>Icon</Label>
                <Input
                  value={templateIcon}
                  onChange={(e) => setTemplateIcon(e.target.value)}
                  placeholder="📄"
                  className="w-20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="A brief description of this template"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={templateCategory} onValueChange={setTemplateCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Visibility</Label>
                <Select value={visibility} onValueChange={(v) => setVisibility(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">System (All Users)</SelectItem>
                    <SelectItem value="company">Company Only</SelectItem>
                    <SelectItem value="personal">Personal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              {onImport && (
                <Button variant="secondary" onClick={handleUseDirectly}>
                  Use Directly
                </Button>
              )}
              <Button 
                onClick={handleSaveAsTemplate} 
                disabled={!templateName.trim() || createTemplate.isPending}
              >
                {createTemplate.isPending ? 'Saving...' : 'Save as Template'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
