import { Download, FileText, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Attachment {
  name: string;
  url: string;
  type: string;
  size?: number;
}

interface FileAttachmentProps {
  attachment: Attachment;
}

const FileAttachment = ({ attachment }: FileAttachmentProps) => {
  const isImage = attachment.type.startsWith('image/');

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isImage) {
    return (
      <div className="mt-2 max-w-md">
        <a href={attachment.url} target="_blank" rel="noopener noreferrer">
          <img 
            src={attachment.url} 
            alt={attachment.name}
            className="rounded-lg border border-border hover:opacity-90 transition-opacity cursor-pointer max-h-96 object-contain"
          />
        </a>
        <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
          <span>{attachment.name}</span>
          {attachment.size && <span>{formatFileSize(attachment.size)}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 max-w-md">
      <a 
        href={attachment.url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
      >
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{attachment.name}</div>
          <div className="text-xs text-muted-foreground">
            {attachment.size && formatFileSize(attachment.size)}
          </div>
        </div>
        <Button variant="ghost" size="icon" className="flex-shrink-0">
          <Download className="w-4 h-4" />
        </Button>
      </a>
    </div>
  );
};

export default FileAttachment;
