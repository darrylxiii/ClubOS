import { useState, useCallback, useEffect } from "react";
import Cropper from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ZoomIn, ZoomOut, RotateCw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface AvatarEditorProps {
  image: string;
  open: boolean;
  onClose: () => void;
  onSave: (croppedImage: Blob) => void;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.src = url;
  });

interface FilterSettings {
  brightness: number;
  contrast: number;
  saturation: number;
  preset: string;
}

const FILTER_PRESETS = {
  none: { brightness: 100, contrast: 100, saturation: 100 },
  vivid: { brightness: 105, contrast: 110, saturation: 130 },
  warm: { brightness: 105, contrast: 100, saturation: 110 },
  cool: { brightness: 100, contrast: 105, saturation: 90 },
  bw: { brightness: 100, contrast: 110, saturation: 0 },
  vintage: { brightness: 110, contrast: 90, saturation: 80 },
  dramatic: { brightness: 95, contrast: 140, saturation: 120 },
};

const getCroppedImg = async (
  imageSrc: string,
  pixelCrop: CropArea,
  rotation: number,
  filters: FilterSettings
): Promise<Blob> => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) throw new Error("No 2d context");

  const size = Math.min(pixelCrop.width, pixelCrop.height);
  canvas.width = size;
  canvas.height = size;

  // Apply filters
  ctx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%)`;

  // Handle rotation
  if (rotation !== 0) {
    ctx.translate(size / 2, size / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-size / 2, -size / 2);
  }

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    size,
    size
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Canvas is empty"));
        return;
      }
      resolve(blob);
    }, "image/jpeg", 0.95);
  });
};

export const AvatarEditor = ({ image, open, onClose, onSave }: AvatarEditorProps) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState<FilterSettings>({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    preset: "none",
  });
  const [previewUrl, setPreviewUrl] = useState<string>("");

  useEffect(() => {
    const generatePreview = async () => {
      if (!croppedAreaPixels) return;
      
      try {
        const blob = await getCroppedImg(image, croppedAreaPixels, rotation, filters);
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        
        return () => URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Error generating preview:", error);
      }
    };
    
    generatePreview();
  }, [croppedAreaPixels, rotation, filters, image]);

  const onCropComplete = useCallback((_: any, croppedAreaPixels: CropArea) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    
    try {
      setSaving(true);
      const croppedImage = await getCroppedImg(image, croppedAreaPixels, rotation, filters);
      onSave(croppedImage);
    } catch (error) {
      console.error("Error cropping image:", error);
    } finally {
      setSaving(false);
    }
  };

  const applyFilterPreset = (preset: keyof typeof FILTER_PRESETS) => {
    const presetFilters = FILTER_PRESETS[preset];
    setFilters({
      ...presetFilters,
      preset,
    });
  };

  const getFilterStyle = () => ({
    filter: `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%)`,
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile Picture</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="relative h-[400px] bg-muted rounded-lg overflow-hidden" style={getFilterStyle()}>
            <Cropper
              image={image}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onCropComplete={onCropComplete}
            />
          </div>

          <Tabs defaultValue="adjust" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="adjust">Adjust</TabsTrigger>
              <TabsTrigger value="filters" className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Filters
              </TabsTrigger>
            </TabsList>

            <TabsContent value="adjust" className="space-y-4 mt-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <ZoomOut className="w-4 h-4" />
                    Zoom
                  </span>
                  <span className="text-muted-foreground">{Math.round(zoom * 100)}%</span>
                </div>
                <Slider
                  value={[zoom]}
                  min={1}
                  max={3}
                  step={0.1}
                  onValueChange={(value) => setZoom(value[0])}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <RotateCw className="w-4 h-4" />
                    Rotation
                  </span>
                  <span className="text-muted-foreground">{rotation}°</span>
                </div>
                <Slider
                  value={[rotation]}
                  min={0}
                  max={360}
                  step={1}
                  onValueChange={(value) => setRotation(value[0])}
                />
              </div>
            </TabsContent>

            <TabsContent value="filters" className="space-y-4 mt-4">
              <div>
                <p className="text-sm font-medium mb-3">Preset Filters</p>
                <div className="grid grid-cols-4 gap-2">
                  {Object.keys(FILTER_PRESETS).map((preset) => (
                    <button
                      key={preset}
                      onClick={() => applyFilterPreset(preset as keyof typeof FILTER_PRESETS)}
                      className={cn(
                        "relative aspect-square rounded-lg overflow-hidden border-2 transition-all",
                        filters.preset === preset
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div
                        className="w-full h-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500"
                        style={{
                          filter: `brightness(${FILTER_PRESETS[preset as keyof typeof FILTER_PRESETS].brightness}%) contrast(${FILTER_PRESETS[preset as keyof typeof FILTER_PRESETS].contrast}%) saturate(${FILTER_PRESETS[preset as keyof typeof FILTER_PRESETS].saturation}%)`,
                        }}
                      />
                      <span className="absolute bottom-1 left-1 right-1 text-[10px] font-medium text-white bg-black/50 rounded px-1 py-0.5 text-center capitalize">
                        {preset}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <p className="text-sm font-medium">Custom Adjustments</p>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Brightness</span>
                    <span className="text-muted-foreground">{filters.brightness}%</span>
                  </div>
                  <Slider
                    value={[filters.brightness]}
                    min={50}
                    max={150}
                    step={1}
                    onValueChange={(value) =>
                      setFilters({ ...filters, brightness: value[0], preset: "custom" })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Contrast</span>
                    <span className="text-muted-foreground">{filters.contrast}%</span>
                  </div>
                  <Slider
                    value={[filters.contrast]}
                    min={50}
                    max={150}
                    step={1}
                    onValueChange={(value) =>
                      setFilters({ ...filters, contrast: value[0], preset: "custom" })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Saturation</span>
                    <span className="text-muted-foreground">{filters.saturation}%</span>
                  </div>
                  <Slider
                    value={[filters.saturation]}
                    min={0}
                    max={200}
                    step={1}
                    onValueChange={(value) =>
                      setFilters({ ...filters, saturation: value[0], preset: "custom" })
                    }
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm font-medium mb-3">Live Preview</p>
            <div className="flex items-center justify-center gap-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-background overflow-hidden mx-auto border-2 border-border">
                  {previewUrl && (
                    <img src={previewUrl} alt="Small preview" className="w-full h-full object-cover" />
                  )}
                </div>
                <span className="text-xs text-muted-foreground">Small</span>
              </div>
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-full bg-background overflow-hidden mx-auto border-2 border-border">
                  {previewUrl && (
                    <img src={previewUrl} alt="Medium preview" className="w-full h-full object-cover" />
                  )}
                </div>
                <span className="text-xs text-muted-foreground">Medium</span>
              </div>
              <div className="text-center space-y-2">
                <div className="w-24 h-24 rounded-full bg-background overflow-hidden mx-auto border-2 border-border">
                  {previewUrl && (
                    <img src={previewUrl} alt="Large preview" className="w-full h-full object-cover" />
                  )}
                </div>
                <span className="text-xs text-muted-foreground">Large</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !croppedAreaPixels}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
