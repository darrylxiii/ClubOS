import { createReactBlockSpec } from '@blocknote/react';
import { useState } from 'react';
import {
  Link, Youtube, Figma, Play, FileText, ExternalLink, X,
  Music, Presentation, Table2, PenTool, Palette, FileSpreadsheet,
  LucideIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface EmbedData {
  type: 'youtube' | 'vimeo' | 'figma' | 'loom' | 'codepen' | 'twitter' | 'miro' |
        'google-docs' | 'google-sheets' | 'google-slides' | 'airtable' | 'notion' |
        'excalidraw' | 'canva' | 'spotify' | 'generic';
  embedUrl: string;
  title?: string;
  aspectRatio?: string;
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
          aspectRatio: '16/9',
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
          aspectRatio: '16/9',
        };
      }
    }

    // Figma
    if (urlObj.hostname.includes('figma.com')) {
      return {
        type: 'figma',
        embedUrl: `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`,
        title: 'Figma Design',
        aspectRatio: '4/3',
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
          aspectRatio: '16/9',
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
          aspectRatio: '16/9',
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

    // Miro
    if (urlObj.hostname.includes('miro.com')) {
      const boardId = urlObj.pathname.split('/').pop();
      return {
        type: 'miro',
        embedUrl: `https://miro.com/app/embed/${boardId}`,
        title: 'Miro Board',
        aspectRatio: '4/3',
      };
    }

    // Google Docs
    if (urlObj.hostname.includes('docs.google.com') && urlObj.pathname.includes('/document/')) {
      const docId = urlObj.pathname.split('/d/')[1]?.split('/')[0];
      if (docId) {
        return {
          type: 'google-docs',
          embedUrl: `https://docs.google.com/document/d/${docId}/preview`,
          title: 'Google Doc',
          aspectRatio: '8.5/11',
        };
      }
    }

    // Google Sheets
    if (urlObj.hostname.includes('docs.google.com') && urlObj.pathname.includes('/spreadsheets/')) {
      const sheetId = urlObj.pathname.split('/d/')[1]?.split('/')[0];
      if (sheetId) {
        return {
          type: 'google-sheets',
          embedUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/preview`,
          title: 'Google Sheet',
          aspectRatio: '16/9',
        };
      }
    }

    // Google Slides
    if (urlObj.hostname.includes('docs.google.com') && urlObj.pathname.includes('/presentation/')) {
      const slideId = urlObj.pathname.split('/d/')[1]?.split('/')[0];
      if (slideId) {
        return {
          type: 'google-slides',
          embedUrl: `https://docs.google.com/presentation/d/${slideId}/embed`,
          title: 'Google Slides',
          aspectRatio: '16/9',
        };
      }
    }

    // Airtable
    if (urlObj.hostname.includes('airtable.com')) {
      const embedUrl = url.replace('airtable.com', 'airtable.com/embed');
      return {
        type: 'airtable',
        embedUrl,
        title: 'Airtable',
        aspectRatio: '16/9',
      };
    }

    // Notion (public pages)
    if (urlObj.hostname.includes('notion.so') || urlObj.hostname.includes('notion.site')) {
      return {
        type: 'notion',
        embedUrl: url,
        title: 'Notion Page',
      };
    }

    // Excalidraw
    if (urlObj.hostname.includes('excalidraw.com')) {
      return {
        type: 'excalidraw',
        embedUrl: url,
        title: 'Excalidraw',
        aspectRatio: '4/3',
      };
    }

    // Canva
    if (urlObj.hostname.includes('canva.com')) {
      return {
        type: 'canva',
        embedUrl: url.replace('/view', '/embed'),
        title: 'Canva Design',
        aspectRatio: '16/9',
      };
    }

    // Spotify
    if (urlObj.hostname.includes('spotify.com')) {
      const embedUrl = url.replace('open.spotify.com', 'open.spotify.com/embed');
      return {
        type: 'spotify',
        embedUrl,
        title: 'Spotify',
        aspectRatio: urlObj.pathname.includes('/track/') ? '100/23' : '100/80',
      };
    }

    // Generic iframe
    return {
      type: 'generic',
      embedUrl: url,
      title: 'Embedded Content',
      aspectRatio: '16/9',
    };
  } catch {
    return null;
  }
}

const embedIcons: Record<string, LucideIcon> = {
  youtube: Youtube,
  vimeo: Play,
  figma: Figma,
  loom: Play,
  codepen: FileText,
  twitter: FileText,
  miro: PenTool,
  'google-docs': FileText,
  'google-sheets': FileSpreadsheet,
  'google-slides': Presentation,
  airtable: Table2,
  notion: FileText,
  excalidraw: PenTool,
  canva: Palette,
  spotify: Music,
  generic: ExternalLink,
};

const embedColors: Record<string, string> = {
  youtube: 'text-red-500',
  spotify: 'text-green-500',
  figma: 'text-purple-500',
  miro: 'text-yellow-500',
  canva: 'text-blue-500',
};

interface EmbedBlockRenderProps {
  block: {
    props: {
      url: string;
    };
  };
  editor: {
    updateBlock: (block: unknown, update: { props: { url: string } }) => void;
  };
}

function EmbedBlockRender(props: EmbedBlockRenderProps) {
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
            placeholder="Paste URL (YouTube, Figma, Miro, Google Docs, Spotify...)"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" size="sm" disabled={!inputUrl.trim()}>
            Embed
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Supports YouTube, Vimeo, Figma, Loom, Miro, Google Docs/Sheets/Slides, Airtable, Canva, Spotify, and more
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

  const Icon = embedIcons[embedData.type] || ExternalLink;
  const iconColor = embedColors[embedData.type] || 'text-muted-foreground';

  // Twitter/Notion need special handling (can't iframe easily)
  if (embedData.type === 'twitter' || embedData.type === 'notion') {
    return (
      <div className="border rounded-lg p-4 my-2" contentEditable={false}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon className={cn("h-4 w-4", iconColor)} />
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
          Open in new tab →
        </a>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden my-2 group" contentEditable={false}>
      <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-4 w-4", iconColor)} />
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
      <div
        className="w-full"
        style={{
          aspectRatio: embedData.aspectRatio || '16/9',
          maxHeight: '500px'
        }}
      >
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
}

export const EmbedBlock = createReactBlockSpec(
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
    render: (props) => <EmbedBlockRender {...props as unknown as EmbedBlockRenderProps} />,
  }
);
