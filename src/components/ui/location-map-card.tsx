import * as React from "react";
import { ExternalLink, MapPin, Navigation, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface LocationMapCardProps {
  latitude: number;
  longitude: number;
  label?: string;
  address?: string;
  size?: "thumbnail" | "card" | "full";
  interactive?: boolean;
  className?: string;
  zoom?: number;
}

function getStaticMapUrl(
  lat: number,
  lon: number,
  zoom: number = 14,
  width: number = 400,
  height: number = 200
): string {
  // Using OpenStreetMap static map service
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lon}&zoom=${zoom}&size=${width}x${height}&markers=${lat},${lon},red-pushpin`;
}

function getInteractiveMapUrl(lat: number, lon: number, zoom: number = 15): string {
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.02},${lat - 0.01},${lon + 0.02},${lat + 0.01}&layer=mapnik&marker=${lat},${lon}`;
}

function getDirectionsUrl(lat: number, lon: number, label?: string): string {
  const destination = label ? encodeURIComponent(label) : `${lat},${lon}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}&destination_place_id=&travelmode=driving`;
}

const sizeConfig = {
  thumbnail: { width: 150, height: 100, containerClass: "w-[150px] h-[100px]" },
  card: { width: 400, height: 200, containerClass: "w-full h-[200px]" },
  full: { width: 800, height: 400, containerClass: "w-full h-[400px]" },
};

export function LocationMapCard({
  latitude,
  longitude,
  label,
  address,
  size = "card",
  interactive = true,
  className,
  zoom = 14,
}: LocationMapCardProps) {
  const config = sizeConfig[size];
  const staticMapUrl = getStaticMapUrl(latitude, longitude, zoom, config.width, config.height);
  const interactiveMapUrl = getInteractiveMapUrl(latitude, longitude, zoom);
  const directionsUrl = getDirectionsUrl(latitude, longitude, label);

  const MapContent = () => (
    <div className={cn("relative rounded-lg overflow-hidden bg-muted", config.containerClass, className)}>
      <img
        src={staticMapUrl}
        alt={`Map showing ${label || address || "location"}`}
        className="w-full h-full object-cover"
        loading="lazy"
      />
      
      {/* Overlay with location info */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 text-white min-w-0">
            <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="min-w-0">
              {label && (
                <p className="font-medium text-sm truncate">{label}</p>
              )}
              {address && (
                <p className="text-xs text-white/80 truncate">{address}</p>
              )}
            </div>
          </div>
          
          {interactive && size !== "thumbnail" && (
            <Button
              variant="secondary"
              size="sm"
              className="shrink-0 h-7 text-xs gap-1"
              onClick={() => window.open(directionsUrl, "_blank")}
            >
              <Navigation className="h-3 w-3" />
              Directions
            </Button>
          )}
        </div>
      </div>

      {/* Expand button for interactive mode */}
      {interactive && size !== "full" && (
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="absolute top-2 right-2 h-7 w-7"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {label || address || "Location"}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 relative rounded-lg overflow-hidden">
              <iframe
                src={interactiveMapUrl}
                className="w-full h-full min-h-[60vh] border-0"
                title={`Interactive map of ${label || address || "location"}`}
                loading="lazy"
              />
              <div className="absolute bottom-4 right-4 flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-1"
                  onClick={() => window.open(directionsUrl, "_blank")}
                >
                  <Navigation className="h-3 w-3" />
                  Get Directions
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-1"
                  onClick={() => window.open(`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}&zoom=${zoom}`, "_blank")}
                >
                  <ExternalLink className="h-3 w-3" />
                  Open in OSM
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );

  return <MapContent />;
}

// Minimal version for list views
export function LocationMapThumbnail({
  latitude,
  longitude,
  className,
}: {
  latitude: number;
  longitude: number;
  className?: string;
}) {
  return (
    <LocationMapCard
      latitude={latitude}
      longitude={longitude}
      size="thumbnail"
      interactive={false}
      className={className}
    />
  );
}
