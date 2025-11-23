import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Loader2, ExternalLink, ImageIcon } from 'lucide-react';

interface LinkPreviewProps {
    url: string;
}

interface LinkMetadata {
    title?: string;
    description?: string;
    image?: string;
    siteName?: string;
}

export function LinkPreview({ url }: LinkPreviewProps) {
    const [metadata, setMetadata] = useState<LinkMetadata | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const { data, error } = await supabase.functions.invoke('fetch-link-metadata', {
                    body: { url },
                });

                if (error) throw error;
                if (data) setMetadata(data);
            } catch (err) {
                console.error('Error fetching link preview:', err);
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        fetchMetadata();
    }, [url]);

    if (error || (!loading && !metadata?.title)) return null;

    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block mt-2 max-w-sm no-underline"
        >
            <Card className="overflow-hidden hover:bg-muted/50 transition-colors border-border/50">
                {loading ? (
                    <div className="p-4 flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-xs">Loading preview...</span>
                    </div>
                ) : (
                    <div className="flex flex-col">
                        {metadata?.image && (
                            <div className="relative h-32 w-full overflow-hidden bg-muted">
                                <img
                                    src={metadata.image}
                                    alt={metadata.title}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                    }}
                                />
                            </div>
                        )}
                        <div className="p-3 space-y-1">
                            <h4 className="font-semibold text-sm line-clamp-1 text-foreground">
                                {metadata?.title}
                            </h4>
                            {metadata?.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                    {metadata.description}
                                </p>
                            )}
                            <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground uppercase tracking-wider">
                                <ExternalLink className="h-3 w-3" />
                                {metadata?.siteName || new URL(url).hostname}
                            </div>
                        </div>
                    </div>
                )}
            </Card>
        </a>
    );
}
