import { createReactBlockSpec } from '@blocknote/react';
import { useState } from 'react';
import { Link, Youtube, Figma, Play, FileText, ExternalLink, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface EmbedData {
  type: 'youtube' | 'vimeo' | 'figma' | 'loom' | 'codepen' | 'twitter' | 'generic';
  embedUrl: string;
  title?: string;
}

function parseEmbedUrl(url: string): EmbedData | null {
  if (!url) return null;

  try {
    const urlObj = new URL(url);
    
    // YouTube
    if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
      let videoId = '';
      if (urlObj.hostname.includes('youtu.be')) {
        videoId = urlObj.pathname.slice(1);
      } else {
        videoId = urlObj.searchParams.get('v') || '';
      }
      if (videoId) {
        return {
          type: 'youtube',
          embedUrl: `https://www.youtube.com/embed/${videoId}`,
          title: 'YouTube Video',
        };
      }
    }

    // Vimeo
    if (urlObj.hostname.includes('vimeo.com')) {
      const videoId = urlObj.pathname.split('/').filter(Boolean).pop();
      if (videoId) {
        return {
          type: 'vimeo',
          embedUrl: `https://player.vimeo.com/video/${videoId}`,
          title: 'Vimeo Video',
        };
      }
    }

    // Figma
    if (urlObj.hostname.includes('figma.com')) {
      return {
        type: 'figma',
        embedUrl: `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`,
        title: 'Figma Design',
      };
    }

    // Loom
    if (urlObj.hostname.includes('loom.com')) {
      const videoId = urlObj.pathname.split('/').filter(Boolean).pop();
      if (videoId) {
        return {
          type: 'loom',
          embedUrl: `https://www.loom.com/embed/${videoId}`,
          title: 'Loom Video',
        };
      }
    }

    // CodePen
    if (urlObj.hostname.includes('codepen.io')) {
      const parts = urlObj.pathname.split('/').filter(Boolean);
      if (parts.length >= 3) {
        const [user, , penId] = parts;
        return {
          type: 'codepen',
          embedUrl: `https://codepen.io/${user}/embed/${penId}?default-tab=result`,
          title: 'CodePen',
        };
      }
    }

    // Twitter/X embed
    if (urlObj.hostname.includes('twitter.com') || urlObj.hostname.includes('x.com')) {
      return {
        type: 'twitter',
        embedUrl: url,
        title: 'Tweet',
      };
    }

    // Generic iframe
    return {
      type: 'generic',
      embedUrl: url,
      title: 'Embedded Content',
    };
  } catch {
    return null;
  }
}

const embedIcons = {
  youtube: Youtube,
  vimeo: Play,
  figma: Figma,
  loom: Play,
  codepen: FileText,
  twitter: FileText,
  generic: ExternalLink,
};

export const EmbedBlock = () => createReactBlockSpec(
  {
    type: 'embed',
    propSchema: {
      url: {
        default: '',
      },
    },
    content: 'none',
  },
  {
    render: (props) => {
      const [inputUrl, setInputUrl] = useState('');
      const url = props.block.props.url as string;
      const embedData = parseEmbedUrl(url);

      const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputUrl.trim()) {
          props.editor.updateBlock(props.block, {
            props: { url: inputUrl.trim() },
          });
        }
      };

      const handleRemove = () => {
        props.editor.updateBlock(props.block, {
          props: { url: '' },
        });
      };

      if (!url) {
        // URL input state
        return (
          <form 
            onSubmit={handleSubmit}
            className="border border-dashed rounded-lg p-6 my-2 bg-muted/20"
            contentEditable={false}
          >
            <div className="flex items-center gap-2 mb-3">
              <Link className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Embed</span>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Paste URL (YouTube, Figma, Loom, Vimeo, CodePen...)"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" size="sm" disabled={!inputUrl.trim()}>
                Embed
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Supports YouTube, Vimeo, Figma, Loom, CodePen, and more
            </p>
          </form>
        );
      }

      if (!embedData) {
        return (
          <div className="border border-destructive/50 rounded-lg p-4 my-2 bg-destructive/10" contentEditable={false}>
            <p className="text-sm text-destructive">Invalid or unsupported URL</p>
            <Button variant="ghost" size="sm" className="mt-2" onClick={handleRemove}>
              Try again
            </Button>
          </div>
        );
      }

      const Icon = embedIcons[embedData.type];

      // Twitter needs special handling (can't iframe)
      if (embedData.type === 'twitter') {
        return (
          <div className="border rounded-lg p-4 my-2" contentEditable={false}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{embedData.title}</span>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleRemove}>
                <X className="h-3 w-3" />
              </Button>
            </div>
            <a 
              href={url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline text-sm"
            >
              View on Twitter/X →
            </a>
          </div>
        );
      }

      return (
        <div className="border rounded-lg overflow-hidden my-2 group" contentEditable={false}>
          <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{embedData.title}</span>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6"
                onClick={() => window.open(url, '_blank')}
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleRemove}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="aspect-video">
            <iframe
              src={embedData.embedUrl}
              className="w-full h-full"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              loading="lazy"
            />
          </div>
        </div>
      );
    },
  }
);
