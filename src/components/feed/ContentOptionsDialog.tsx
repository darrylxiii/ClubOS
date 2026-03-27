import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Image, Video, FileText, BarChart2 } from "lucide-react";

interface ContentOptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPhotoSelect: () => void;
  onVideoSelect: () => void;
  onDocumentSelect: () => void;
  onPollSelect: () => void;
  disabled?: boolean;
}

export function ContentOptionsDialog({
  open,
  onOpenChange,
  onPhotoSelect,
  onVideoSelect,
  onDocumentSelect,
  onPollSelect,
  disabled
}: ContentOptionsDialogProps) {
  const { t } = useTranslation('common');
  const handleOptionClick = (callback: () => void) => {
    callback();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("add_to_your_post", "Add to your post")}</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-3 py-4">
          <Button
            variant="outline"
            className="h-24 flex-col gap-2"
            onClick={() => handleOptionClick(onPhotoSelect)}
            disabled={disabled}
          >
            <Image className="w-8 h-8" />
            <span>{t("photo", "Photo")}</span>
          </Button>
          
          <Button
            variant="outline"
            className="h-24 flex-col gap-2"
            onClick={() => handleOptionClick(onVideoSelect)}
            disabled={disabled}
          >
            <Video className="w-8 h-8" />
            <span>{t("video", "Video")}</span>
          </Button>
          
          <Button
            variant="outline"
            className="h-24 flex-col gap-2"
            onClick={() => handleOptionClick(onDocumentSelect)}
            disabled={disabled}
          >
            <FileText className="w-8 h-8" />
            <span>{t("document", "Document")}</span>
          </Button>
          
          <Button
            variant="outline"
            className="h-24 flex-col gap-2"
            onClick={() => handleOptionClick(onPollSelect)}
            disabled={disabled}
          >
            <BarChart2 className="w-8 h-8" />
            <span>{t("poll", "Poll")}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
