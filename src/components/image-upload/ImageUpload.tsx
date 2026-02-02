import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ImageEditor, IMAGE_EDITOR_PRESETS, type ImageEditorPreset, type ImageEditorConfig } from '@/components/image-editor';
import { useImageUpload } from '@/hooks/useImageUpload';

interface ImageUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
  userId: string;
  bucket: string;
  
  // Editor configuration
  preset?: ImageEditorPreset;
  config?: Partial<ImageEditorConfig>;
  
  // Upload options
  maxFileSize?: number;
  
  // UI
  label?: string;
  placeholder?: React.ReactNode;
  showRemoveButton?: boolean;
  disabled?: boolean;
  className?: string;
  previewClassName?: string;
  required?: boolean;
  
  // Shape for preview
  previewShape?: 'circle' | 'square' | 'rectangle';
  previewAspectRatio?: number;
}

export function ImageUpload({
  value,
  onChange,
  userId,
  bucket,
  preset = 'avatar',
  config: customConfig,
  maxFileSize = 10 * 1024 * 1024,
  label,
  placeholder,
  showRemoveButton = true,
  disabled = false,
  className,
  previewClassName,
  required = false,
  previewShape,
  previewAspectRatio,
}: ImageUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(value);
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get preset config
  const presetConfig = IMAGE_EDITOR_PRESETS[preset];
  const finalConfig = { ...presetConfig, ...customConfig };
  const finalPreviewShape = previewShape || presetConfig.previewShape || 'square';
  const finalAspectRatio = previewAspectRatio || presetConfig.aspectRatio;

  const { uploading, uploadBlob, deleteFile } = useImageUpload({
    bucket,
    userId,
    maxFileSize,
    onSuccess: (url) => {
      setPreviewUrl(url);
      onChange(url);
    },
  });

  // Sync with external value changes
  useEffect(() => {
    setPreviewUrl(value);
  }, [value]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size
    if (file.size > maxFileSize) {
      toast.error(`Image must be less than ${Math.round(maxFileSize / 1024 / 1024)}MB`);
      return;
    }

    // Create preview and open editor
    const objectUrl = URL.createObjectURL(file);
    setSelectedImage(objectUrl);
    setEditorOpen(true);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [maxFileSize]);

  const handleEditorSave = useCallback(async (blob: Blob) => {
    setEditorOpen(false);
    
    // Cleanup selected image
    if (selectedImage) {
      URL.revokeObjectURL(selectedImage);
      setSelectedImage(null);
    }

    // Delete old image if exists
    if (value) {
      await deleteFile(value);
    }

    // Upload new image
    await uploadBlob(blob);
  }, [selectedImage, value, deleteFile, uploadBlob]);

  const handleEditorClose = useCallback(() => {
    setEditorOpen(false);
    if (selectedImage) {
      URL.revokeObjectURL(selectedImage);
      setSelectedImage(null);
    }
  }, [selectedImage]);

  const handleRemove = useCallback(async () => {
    if (!value) return;

    await deleteFile(value);
    setPreviewUrl(null);
    onChange(null);
    toast.success('Image removed');
  }, [value, deleteFile, onChange]);

  const getPreviewClasses = () => {
    switch (finalPreviewShape) {
      case 'circle':
        return 'rounded-full';
      case 'rectangle':
        return 'rounded-lg';
      case 'square':
      default:
        return 'rounded-lg';
    }
  };

  const getPreviewStyle = () => {
    if (finalPreviewShape === 'rectangle') {
      return { aspectRatio: String(finalAspectRatio) };
    }
    return { aspectRatio: '1' };
  };

  return (
    <>
      <div className={cn('space-y-4', className)}>
        {label && (
          <Label className="flex items-center gap-2">
            {label}
            {required && !previewUrl && (
              <span className="text-xs text-muted-foreground ml-2 px-2 py-0.5 bg-muted rounded">
                Required
              </span>
            )}
          </Label>
        )}

        <div className="flex items-center gap-6">
          {/* Preview */}
          <div
            className={cn(
              'relative bg-muted border-2 border-border overflow-hidden flex items-center justify-center',
              getPreviewClasses(),
              finalPreviewShape === 'rectangle' ? 'w-40' : 'w-24 h-24',
              previewClassName
            )}
            style={getPreviewStyle()}
          >
            {uploading ? (
              <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
            ) : previewUrl ? (
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            ) : (
              placeholder || <ImageIcon className="w-8 h-8 text-muted-foreground" />
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={disabled || uploading}
            />

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || uploading}
              className="w-fit"
            >
              <Upload className="w-4 h-4 mr-2" />
              {previewUrl ? 'Change' : 'Upload'}
            </Button>

            {showRemoveButton && previewUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                disabled={disabled || uploading}
                className="w-fit"
              >
                <X className="w-4 h-4 mr-2" />
                Remove
              </Button>
            )}

            <p className="text-xs text-muted-foreground">
              Max {Math.round(maxFileSize / 1024 / 1024)}MB
            </p>
          </div>
        </div>
      </div>

      {/* Image Editor Dialog */}
      {selectedImage && (
        <ImageEditor
          image={selectedImage}
          open={editorOpen}
          onClose={handleEditorClose}
          onSave={handleEditorSave}
          preset={preset}
          config={customConfig}
        />
      )}
    </>
  );
}
