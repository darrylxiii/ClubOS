import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { CheckCircle2, Shield } from "lucide-react";

export default function ResetPasswordSuccess() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-background/95 p-4">
      <Card className="w-full max-w-md backdrop-blur-xl bg-card/80 border-border/50 shadow-2xl">
        <CardHeader className="space-y-4 text-center pt-8">
          <div className="w-16 h-16 mx-auto bg-success/20 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-success" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Password Changed</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Your password has been updated successfully
            </p>
          </div>
        </CardHeader>

        <CardContent className="pb-8 space-y-6">
          <div className="flex items-start gap-3 text-sm text-muted-foreground bg-muted/30 border border-border/30 rounded-lg p-4">
            <Shield className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-foreground font-medium">All sessions have been signed out</p>
              <p>For security, all active sessions were invalidated. Please sign in with your new password.</p>
            </div>
          </div>

          <RainbowButton
            onClick={() => navigate('/auth')}
            className="w-full"
          >
            Sign In
          </RainbowButton>
        </CardContent>
      </Card>
    </div>
  );
}
