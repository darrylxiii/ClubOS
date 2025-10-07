import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut, RotateCw } from "lucide-react";

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

const getCroppedImg = async (imageSrc: string, pixelCrop: CropArea): Promise<Blob> => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) throw new Error("No 2d context");

  const size = Math.min(pixelCrop.width, pixelCrop.height);
  canvas.width = size;
  canvas.height = size;

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

  const onCropComplete = useCallback((_: any, croppedAreaPixels: CropArea) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    
    try {
      setSaving(true);
      const croppedImage = await getCroppedImg(image, croppedAreaPixels);
      onSave(croppedImage);
    } catch (error) {
      console.error("Error cropping image:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Profile Picture</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="relative h-[400px] bg-muted rounded-lg overflow-hidden">
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

          <div className="space-y-4">
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
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-3">Preview at different sizes:</p>
            <div className="flex items-center gap-4">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-full bg-background overflow-hidden mx-auto border-2 border-border">
                  <img src={image} alt="Small preview" className="w-full h-full object-cover" />
                </div>
                <span className="text-xs text-muted-foreground">Small</span>
              </div>
              <div className="text-center space-y-1">
                <div className="w-16 h-16 rounded-full bg-background overflow-hidden mx-auto border-2 border-border">
                  <img src={image} alt="Medium preview" className="w-full h-full object-cover" />
                </div>
                <span className="text-xs text-muted-foreground">Medium</span>
              </div>
              <div className="text-center space-y-1">
                <div className="w-24 h-24 rounded-full bg-background overflow-hidden mx-auto border-2 border-border">
                  <img src={image} alt="Large preview" className="w-full h-full object-cover" />
                </div>
                <span className="text-xs text-muted-foreground">Large</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
