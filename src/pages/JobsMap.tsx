import { GlobalJobsMap } from "@/components/maps/GlobalJobsMap";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function JobsMap() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Global Jobs Map</h1>
            <p className="text-sm text-muted-foreground">Explore opportunities worldwide</p>
          </div>
        </div>
      </header>

      {/* Map Container */}
      <main className="pt-20 h-screen">
        <GlobalJobsMap className="h-[calc(100vh-5rem)]" />
      </main>
    </div>
  );
}
