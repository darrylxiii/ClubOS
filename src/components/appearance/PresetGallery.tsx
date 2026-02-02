import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAppearance } from '@/contexts/AppearanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ImageEditor } from '@/components/image-editor';

interface Preset {
  id: string;
  category: string;
  name: string;
  image_url: string;
}

export function PresetGallery() {
  const { settings, updateSettings } = useAppearance();
  const { user } = useAuth();
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    try {
      const { data, error } = await supabase
        .from('appearance_presets')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      setPresets(data || []);
    } catch (error) {
      console.error('Error loading presets:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = [...new Set(presets.map((p) => p.category))];
  const displayPresets = selectedCategory
    ? presets.filter((p) => p.category === selectedCategory)
    : presets.slice(0, 6);

  const handleSelectPreset = (preset: Preset) => {
    updateSettings({
      backgroundType: 'preset',
      backgroundValue: preset.image_url,
    });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setSelectedImage(objectUrl);
    setEditorOpen(true);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEditorSave = async (blob: Blob) => {
    if (!user) {
      toast.error('Please log in to upload custom backgrounds');
      return;
    }

    setEditorOpen(false);
    setUploading(true);

    try {
      const fileName = `${Date.now()}.jpg`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('virtual-backgrounds')
        .upload(filePath, blob, { cacheControl: '3600', contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('virtual-backgrounds')
        .getPublicUrl(filePath);

      updateSettings({
        backgroundType: 'custom',
        backgroundValue: publicUrl,
      });

      toast.success('Custom background uploaded');
    } catch (error: any) {
      console.error('Error uploading background:', error);
      toast.error('Failed to upload background');
    } finally {
      setUploading(false);
      if (selectedImage) {
        URL.revokeObjectURL(selectedImage);
        setSelectedImage(null);
      }
    }
  };

  const handleEditorClose = () => {
    setEditorOpen(false);
    if (selectedImage) {
      URL.revokeObjectURL(selectedImage);
      setSelectedImage(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Category tabs */}
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant={!selectedCategory ? 'default' : 'outline'}
            onClick={() => setSelectedCategory(null)}
          >
            Popular
          </Button>
          {categories.map((category) => (
            <Button
              key={category}
              size="sm"
              variant={selectedCategory === category ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(category)}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </Button>
          ))}
        </div>

        {/* Presets grid */}
        <div className="grid grid-cols-3 gap-3">
          {displayPresets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleSelectPreset(preset)}
              className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
                settings.backgroundValue === preset.image_url
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <img
                src={preset.image_url}
                alt={preset.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent flex items-end p-2">
                <p className="text-xs font-medium">{preset.name}</p>
              </div>
            </button>
          ))}

          {/* Upload button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />
          <button
            className="aspect-video rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-all flex flex-col items-center justify-center gap-2 hover:bg-accent/50"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
            ) : (
              <Upload className="w-6 h-6 text-muted-foreground" />
            )}
            <span className="text-xs text-muted-foreground">
              {uploading ? 'Uploading...' : 'Add image'}
            </span>
          </button>
        </div>

        {selectedCategory && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedCategory(null)}
            className="w-full"
          >
            Show less
          </Button>
        )}
      </div>

      {selectedImage && (
        <ImageEditor
          image={selectedImage}
          open={editorOpen}
          onClose={handleEditorClose}
          onSave={handleEditorSave}
          preset="virtualBackground"
        />
      )}
    </>
  );
}
