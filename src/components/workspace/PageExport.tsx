import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Download, FileText, FileCode, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { WorkspacePage } from '@/hooks/useWorkspacePages';

interface PageExportProps {
  page: WorkspacePage;
}

export function PageExport({ page }: PageExportProps) {
  const [exporting, setExporting] = useState<'pdf' | 'md' | null>(null);

  // Convert BlockNote content to plain text
  const contentToText = (content: any[]): string => {
    if (!content || !Array.isArray(content)) return '';

    return content
      .map((block) => {
        let text = '';
        const type = block.type || 'paragraph';
        const blockContent = block.content || [];

        // Extract text from content array
        const textContent = blockContent
          .map((item: any) => {
            if (item.type === 'text') return item.text || '';
            if (item.type === 'link') return item.content?.[0]?.text || '';
            return '';
          })
          .join('');

        // Format based on block type
        switch (type) {
          case 'heading':
            const level = block.props?.level || 1;
            text = '#'.repeat(level) + ' ' + textContent;
            break;
          case 'bulletListItem':
            text = '• ' + textContent;
            break;
          case 'numberedListItem':
            text = '1. ' + textContent;
            break;
          case 'checkListItem':
            const checked = block.props?.checked ? '☑' : '☐';
            text = checked + ' ' + textContent;
            break;
          case 'codeBlock':
            text = '```\n' + textContent + '\n```';
            break;
          case 'table':
            // Basic table support
            text = '[Table]';
            break;
          default:
            text = textContent;
        }

        // Handle nested children
        if (block.children && block.children.length > 0) {
          const childText = contentToText(block.children);
          text += '\n' + childText.split('\n').map((line: string) => '  ' + line).join('\n');
        }

        return text;
      })
      .filter((t) => t)
      .join('\n\n');
  };

  // Convert to Markdown
  const contentToMarkdown = (content: any[]): string => {
    if (!content || !Array.isArray(content)) return '';

    return content
      .map((block) => {
        let md = '';
        const type = block.type || 'paragraph';
        const blockContent = block.content || [];

        // Extract and format inline content
        const inlineContent = blockContent
          .map((item: any) => {
            let text = item.text || '';
            if (item.type === 'link') {
              const linkText = item.content?.[0]?.text || item.href;
              return `[${linkText}](${item.href})`;
            }
            // Apply styles
            if (item.styles) {
              if (item.styles.bold) text = `**${text}**`;
              if (item.styles.italic) text = `*${text}*`;
              if (item.styles.strike) text = `~~${text}~~`;
              if (item.styles.code) text = `\`${text}\``;
            }
            return text;
          })
          .join('');

        switch (type) {
          case 'heading':
            const level = block.props?.level || 1;
            md = '#'.repeat(level) + ' ' + inlineContent;
            break;
          case 'bulletListItem':
            md = '- ' + inlineContent;
            break;
          case 'numberedListItem':
            md = '1. ' + inlineContent;
            break;
          case 'checkListItem':
            const checked = block.props?.checked ? 'x' : ' ';
            md = `- [${checked}] ` + inlineContent;
            break;
          case 'codeBlock':
            const lang = block.props?.language || '';
            md = '```' + lang + '\n' + inlineContent + '\n```';
            break;
          case 'image':
            md = `![${block.props?.caption || 'Image'}](${block.props?.url || ''})`;
            break;
          case 'table':
            md = '[Table content]';
            break;
          default:
            md = inlineContent || '';
        }

        // Handle nested children with indentation
        if (block.children && block.children.length > 0) {
          const childMd = contentToMarkdown(block.children);
          md += '\n' + childMd.split('\n').map((line: string) => '  ' + line).join('\n');
        }

        return md;
      })
      .filter((m) => m !== '')
      .join('\n\n');
  };

  const exportToPDF = async () => {
    setExporting('pdf');
    try {
      // Dynamic import jsPDF
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(24);
      doc.text(page.title || 'Untitled', 20, 30);
      
      // Content
      doc.setFontSize(12);
      const content = contentToText(page.content as any[] || []);
      const lines = doc.splitTextToSize(content, 170);
      
      let y = 50;
      const pageHeight = doc.internal.pageSize.height;
      
      for (const line of lines) {
        if (y > pageHeight - 20) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, 20, y);
        y += 7;
      }

      // Save
      const filename = `${page.title || 'untitled'}.pdf`.replace(/[^a-z0-9.-]/gi, '_');
      doc.save(filename);
      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF');
    } finally {
      setExporting(null);
    }
  };

  const exportToMarkdown = async () => {
    setExporting('md');
    try {
      const title = `# ${page.title || 'Untitled'}\n\n`;
      const content = contentToMarkdown(page.content as any[] || []);
      const markdown = title + content;

      // Create download
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${page.title || 'untitled'}.md`.replace(/[^a-z0-9.-]/gi, '_');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Markdown exported successfully');
    } catch (error) {
      console.error('Markdown export error:', error);
      toast.error('Failed to export Markdown');
    } finally {
      setExporting(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToPDF} disabled={exporting !== null}>
          {exporting === 'pdf' ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <FileText className="h-4 w-4 mr-2" />
          )}
          Export as PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToMarkdown} disabled={exporting !== null}>
          {exporting === 'md' ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <FileCode className="h-4 w-4 mr-2" />
          )}
          Export as Markdown
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
