import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, HelpCircle } from "lucide-react";

interface MinimalHeaderProps {
  showBackButton?: boolean;
  backPath?: string;
  showHelpLink?: boolean;
  className?: string;
}

export function MinimalHeader({
  showBackButton = true,
  backPath,
  showHelpLink = true,
  className = "",
}: MinimalHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backPath) {
      navigate(backPath);
    } else {
      navigate(-1);
    }
  };

  return (
    <header className={`w-full border-b border-border/50 bg-background/80 backdrop-blur-sm ${className}`}>
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        {/* Left: Back button or Logo */}
        <div className="flex items-center gap-3">
          {showBackButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
          )}
          
          {/* TQC Logo/Brand */}
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">Q</span>
            </div>
            <span className="text-sm font-semibold hidden sm:inline">
              The Quantum Club
            </span>
          </div>
        </div>

        {/* Right: Help link */}
        {showHelpLink && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/help")}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <HelpCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Help</span>
          </Button>
        )}
      </div>
    </header>
  );
}
