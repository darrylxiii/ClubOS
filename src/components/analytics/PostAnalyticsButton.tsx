import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { BarChart3 } from "lucide-react";
import { useState } from "react";
import { PostAnalyticsDialog } from "@/components/social/PostAnalyticsDialog";

interface PostAnalyticsButtonProps {
  postId: string;
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
  showLabel?: boolean;
}

export const PostAnalyticsButton = ({
  postId,
  variant = "ghost",
  size = "sm",
  showLabel = true,
}: PostAnalyticsButtonProps) => {
  const { t } = useTranslation('analytics');
  const [showDialog, setShowDialog] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setShowDialog(true)}
        className="gap-2"
      >
        <BarChart3 className="h-4 w-4" />
        {showLabel && t('analytics')}
      </Button>

      <PostAnalyticsDialog postId={postId} open={showDialog} onOpenChange={setShowDialog} />
    </>
  );
};