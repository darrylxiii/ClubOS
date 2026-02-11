import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, Trash2, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface VirtualBackground {
    id: string;
    image_url: string;
    thumbnail_url: string | null;
    name: string | null;
}

interface BackgroundImagePickerProps {
    selectedImageUrl?: string;
    onSelect: (imageUrl: string) => void;
}

export const BackgroundImagePicker = ({ selectedImageUrl, onSelect }: BackgroundImagePickerProps) => {
    const { user } = useAuth();
    const [backgrounds, setBackgrounds] = useState<VirtualBackground[]>([]);
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadBackgrounds();
    }, [user]);

    const loadBackgrounds = async () => {
        if (!user) return;

        const { data, error } = await (supabase
            .from('virtual_backgrounds' as any)
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }) as any);

        if (error) {
            console.error('Error loading backgrounds:', error);
            toast.error('Failed to load backgrounds');
        } else {
            setBackgrounds((data || []) as VirtualBackground[]);
        }
        setLoading(false);
    };

    const uploadBackground = async (file: File) => {
        if (!user) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image must be less than 5MB');
            return;
        }

        setUploading(true);

        try {
            // Upload to Supabase Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('virtual-backgrounds')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('virtual-backgrounds')
                .getPublicUrl(fileName);

            // Create thumbnail (smaller version)
            const thumbnailFileName = `${user.id}/thumb_${Date.now()}.${fileExt}`;

            // For now, use same image as thumbnail (in production, you'd resize it)
            const thumbnailUrl = publicUrl;

            // Save to database
            const { error: dbError } = await (supabase
                .from('virtual_backgrounds' as any)
                .insert({
                    user_id: user.id,
                    image_url: publicUrl,
                    thumbnail_url: thumbnailUrl,
                    name: file.name
                }) as any);

            if (dbError) throw dbError;

            toast.success('Background uploaded successfully');
            await loadBackgrounds();
        } catch (error: unknown) {
            console.error('Error uploading background:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to upload background');
        } finally {
            setUploading(false);
        }
    };

    const deleteBackground = async (id: string, imageUrl: string) => {
        if (!user) return;

        try {
            // Extract file path from URL
            const urlParts = imageUrl.split('/virtual-backgrounds/');
            if (urlParts.length === 2) {
                const filePath = urlParts[1];

                // Delete from storage
                const { error: storageError } = await supabase.storage
                    .from('virtual-backgrounds')
                    .remove([filePath]);

                if (storageError) {
                    console.error('Storage deletion error:', storageError);
                }
            }

            // Delete from database
            const { error: dbError } = await (supabase
                .from('virtual_backgrounds' as any)
                .delete()
                .eq('id', id) as any);

            if (dbError) throw dbError;

            toast.success('Background deleted');
            await loadBackgrounds();
        } catch (error: unknown) {
            console.error('Error deleting background:', error);
            toast.error('Failed to delete background');
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            uploadBackground(file);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Label>Custom Backgrounds</Label>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={uploading}
                    onClick={() => document.getElementById('bg-upload-input')?.click()}
                >
                    {uploading ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Uploading...
                        </>
                    ) : (
                        <>
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Image
                        </>
                    )}
                </Button>
                <input
                    id="bg-upload-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                />
            </div>

            {backgrounds.length === 0 ? (
                <div className="text-center p-8 border-2 border-dashed border-border rounded-lg">
                    <ImageIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">No custom backgrounds yet</p>
                    <p className="text-xs text-muted-foreground">Upload an image to get started</p>
                </div>
            ) : (
                <ScrollArea className="h-64 border border-border rounded-lg p-2">
                    <div className="grid grid-cols-3 gap-2">
                        {backgrounds.map((bg) => (
                            <div
                                key={bg.id}
                                className={`relative group rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${selectedImageUrl === bg.image_url
                                        ? 'border-primary ring-2 ring-primary/20'
                                        : 'border-transparent hover:border-border'
                                    }`}
                                onClick={() => onSelect(bg.image_url)}
                            >
                                <img
                                    src={bg.thumbnail_url || bg.image_url}
                                    alt={bg.name || 'Background'}
                                    className="w-full h-20 object-cover"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                                    <Button
                                        variant="secondary"
                                        size="icon"
                                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-500/80 hover:bg-red-600 text-white"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteBackground(bg.id, bg.image_url);
                                        }}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                                {selectedImageUrl === bg.image_url && (
                                    <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-1">
                                        <ImageIcon className="w-3 h-3" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            )}

            <p className="text-xs text-muted-foreground">
                Tip: Use high-quality images (1920x1080) for best results. Max 5MB.
            </p>
        </div>
    );
};
