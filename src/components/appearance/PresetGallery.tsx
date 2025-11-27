import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAppearance } from '@/contexts/AppearanceContext';
import { Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Preset {
  id: string;
  category: string;
  name: string;
  image_url: string;
}

export function PresetGallery() {
  const { settings, updateSettings } = useAppearance();
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
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
        <button
          className="aspect-video rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-all flex flex-col items-center justify-center gap-2 hover:bg-accent/50"
          onClick={() => {
            // Upload functionality will be added in next phase
            console.log('Upload custom background');
          }}
        >
          <Upload className="w-6 h-6 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Add image</span>
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
  );
}
