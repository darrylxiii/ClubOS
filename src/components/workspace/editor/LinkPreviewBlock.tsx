import { createReactBlockSpec } from '@blocknote/react';
import { useState, useEffect } from 'react';
import { Link, ExternalLink, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';

interface LinkMetadata {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  url: string;
}

export const LinkPreviewBlock = createReactBlockSpec(
  {
    type: 'linkPreview',
    propSchema: {
      url: { default: '' },
      title: { default: '' },
      description: { default: '' },
      image: { default: '' },
      siteName: { default: '' },
    },
    content: 'none',
  },
  {
    render: (props) => {
      const [inputUrl, setInputUrl] = useState('');
      const [isLoading, setIsLoading] = useState(false);
      const [error, setError] = useState<string | null>(null);
      
      const url = props.block.props.url as string;
      const title = props.block.props.title as string;
      const description = props.block.props.description as string;
      const image = props.block.props.image as string;
      const siteName = props.block.props.siteName as string;

      const fetchMetadata = async (fetchUrl: string) => {
        setIsLoading(true);
        setError(null);
        
        try {
          const { data, error: fetchError } = await supabase.functions.invoke('fetch-link-metadata', {
            body: { url: fetchUrl },
          });

          if (fetchError) throw fetchError;

          props.editor.updateBlock(props.block, {
            props: {
              url: fetchUrl,
              title: data.title || '',
              description: data.description || '',
              image: data.image || '',
              siteName: data.siteName || new URL(fetchUrl).hostname,
            },
          });
        } catch (err) {
          console.error('Failed to fetch link metadata:', err);
          // Still save the URL even if metadata fetch fails
          props.editor.updateBlock(props.block, {
            props: {
              url: fetchUrl,
              title: fetchUrl,
              siteName: new URL(fetchUrl).hostname,
            },
          });
        } finally {
          setIsLoading(false);
        }
      };

      const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputUrl.trim()) {
          try {
            new URL(inputUrl.trim());
            fetchMetadata(inputUrl.trim());
          } catch {
            setError('Please enter a valid URL');
          }
        }
      };

      const handleRemove = () => {
        props.editor.updateBlock(props.block, {
          props: { url: '', title: '', description: '', image: '', siteName: '' },
        });
      };

      if (!url) {
        return (
          <form 
            onSubmit={handleSubmit}
            className="border border-dashed rounded-lg p-6 my-2 bg-muted/20"
            contentEditable={false}
          >
            <div className="flex items-center gap-2 mb-3">
              <Link className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Link Preview</span>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Paste any URL to create a preview..."
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                className="flex-1"
                disabled={isLoading}
              />
              <Button type="submit" size="sm" disabled={!inputUrl.trim() || isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Preview'}
              </Button>
            </div>
            {error && <p className="text-xs text-destructive mt-2">{error}</p>}
          </form>
        );
      }

      if (isLoading) {
        return (
          <div className="border rounded-lg p-4 my-2 animate-pulse" contentEditable={false}>
            <div className="flex gap-4">
              <div className="w-24 h-24 bg-muted rounded" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
            </div>
          </div>
        );
      }

      return (
        <div 
          className="border rounded-lg overflow-hidden my-2 group hover:border-primary/50 transition-colors cursor-pointer"
          contentEditable={false}
          onClick={() => window.open(url, '_blank')}
        >
          <div className="flex">
            {image && (
              <div className="w-32 h-24 flex-shrink-0 bg-muted">
                <img
                  src={image}
                  alt={title || 'Preview'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
            <div className="flex-1 p-3 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  {siteName && (
                    <p className="text-xs text-muted-foreground mb-1 truncate">
                      {siteName}
                    </p>
                  )}
                  <h4 className="font-medium text-sm line-clamp-1">
                    {title || url}
                  </h4>
                  {description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(url, '_blank');
                    }}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove();
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    },
  }
);
