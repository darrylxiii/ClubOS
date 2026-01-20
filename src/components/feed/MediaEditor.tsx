import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Canvas as FabricCanvas, FabricImage, filters } from "fabric";
import { Crop, RotateCw, Sun, Contrast, Droplets, Sparkles } from "lucide-react";

interface MediaEditorProps {
  file: File;
  open: boolean;
  onClose: () => void;
  onSave: (editedFile: File) => void;
}

export function MediaEditor({ file, open, onClose, onSave }: MediaEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [image, setImage] = useState<FabricImage | null>(null);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (!canvasRef.current || !open) return;

    // Clean up previous canvas
    if (fabricCanvas) {
      fabricCanvas.dispose();
    }

    const canvas = new FabricCanvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: "#ffffff",
    });

    setFabricCanvas(canvas);

    // Load image
    const reader = new FileReader();
    reader.onload = (e) => {
      const imgElement = new Image();
      imgElement.src = e.target?.result as string;
      imgElement.onload = () => {
        FabricImage.fromURL(e.target?.result as string).then((img) => {
          // Calculate scale to fit canvas while maintaining aspect ratio
          const scale = Math.min(
            (canvas.width! - 40) / img.width!,
            (canvas.height! - 40) / img.height!
          );
          
          img.scale(scale);
          img.set({
            left: canvas.width! / 2,
            top: canvas.height! / 2,
            originX: 'center',
            originY: 'center',
            selectable: false, // Prevent accidental dragging
          });
          
          canvas.add(img);
          canvas.centerObject(img);
          setImage(img);
          canvas.renderAll();
        });
      };
    };
    reader.readAsDataURL(file);

    return () => {
      canvas.dispose();
    };
  }, [file, open]);

  const applyFilters = () => {
    if (!image || !fabricCanvas) return;

    const filterList: any[] = [];

    if (brightness !== 0) {
      filterList.push(new filters.Brightness({
        brightness: brightness / 100,
      }));
    }

    if (contrast !== 0) {
      filterList.push(new filters.Contrast({
        contrast: contrast / 100,
      }));
    }

    if (saturation !== 0) {
      filterList.push(new filters.Saturation({
        saturation: saturation / 100,
      }));
    }

    image.filters = filterList;
    image.applyFilters();
    fabricCanvas.renderAll();
  };

  useEffect(() => {
    applyFilters();
  }, [brightness, contrast, saturation]);

  const handleRotate = () => {
    if (!image || !fabricCanvas) return;
    const newRotation = (rotation + 90) % 360;
    setRotation(newRotation);
    image.rotate(newRotation);
    fabricCanvas.renderAll();
  };

  const handleSave = async () => {
    if (!fabricCanvas) return;

    // Export canvas as blob
    const dataURL = fabricCanvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 1,
    });

    // Convert data URL to blob
    const response = await fetch(dataURL);
    const blob = await response.blob();
    
    // Create file from blob
    const editedFile = new File([blob], file.name, { type: 'image/png' });
    onSave(editedFile);
    onClose();
  };

  const handleReset = () => {
    setBrightness(0);
    setContrast(0);
    setSaturation(0);
    setRotation(0);
    if (image) {
      image.filters = [];
      image.rotate(0);
      image.applyFilters();
      fabricCanvas?.renderAll();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Edit Image</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-center bg-muted rounded-lg border p-4">
            <canvas ref={canvasRef} className="max-w-full" />
          </div>

          <Tabs defaultValue="adjust" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="adjust">Adjust</TabsTrigger>
              <TabsTrigger value="transform">Transform</TabsTrigger>
            </TabsList>

            <TabsContent value="adjust" className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Sun className="w-4 h-4" />
                  <span className="text-sm w-24">Brightness</span>
                  <Slider
                    value={[brightness]}
                    onValueChange={(v) => setBrightness(v[0])}
                    min={-100}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-sm w-12 text-right">{brightness}</span>
                </div>

                <div className="flex items-center gap-3">
                  <Contrast className="w-4 h-4" />
                  <span className="text-sm w-24">Contrast</span>
                  <Slider
                    value={[contrast]}
                    onValueChange={(v) => setContrast(v[0])}
                    min={-100}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-sm w-12 text-right">{contrast}</span>
                </div>

                <div className="flex items-center gap-3">
                  <Droplets className="w-4 h-4" />
                  <span className="text-sm w-24">Saturation</span>
                  <Slider
                    value={[saturation]}
                    onValueChange={(v) => setSaturation(v[0])}
                    min={-100}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-sm w-12 text-right">{saturation}</span>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="transform" className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleRotate}
                  className="flex-1"
                >
                  <RotateCw className="w-4 h-4 mr-2" />
                  Rotate 90°
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleReset}>
              Reset
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}