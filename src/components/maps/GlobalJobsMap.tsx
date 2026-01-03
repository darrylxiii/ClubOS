import * as React from "react";
import { useJobLocations, JobLocation } from "@/hooks/useJobLocations";
import { cn } from "@/lib/utils";
import { MapPin, Briefcase, Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Link } from "react-router-dom";

interface GlobalJobsMapProps {
  className?: string;
  initialFilters?: {
    employmentType?: string;
    companyId?: string;
  };
  onJobClick?: (job: JobLocation) => void;
  showFilters?: boolean;
  showSidebar?: boolean;
  height?: string;
}

// Convert lat/lng to x/y position on a simple Mercator projection
function latLngToPosition(lat: number, lng: number, width: number, height: number) {
  // Clamp latitude to avoid infinity at poles
  const clampedLat = Math.max(-85, Math.min(85, lat));
  
  const x = ((lng + 180) / 360) * width;
  const latRad = (clampedLat * Math.PI) / 180;
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const y = height / 2 - (mercN * width) / (2 * Math.PI);
  
  return { x, y };
}

// Dot component for individual job or cluster
function JobDot({
  job,
  x,
  y,
  isCluster = false,
  count = 1,
  onClick,
}: {
  job: JobLocation;
  x: number;
  y: number;
  isCluster?: boolean;
  count?: number;
  onClick?: () => void;
}) {
  const size = isCluster ? Math.min(12 + count * 2, 32) : 8;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className={cn(
              "absolute rounded-full transition-all duration-200 hover:scale-150 hover:z-50",
              isCluster
                ? "bg-accent/80 border-2 border-accent-foreground/20 flex items-center justify-center text-[10px] font-bold text-accent-foreground"
                : "bg-accent animate-pulse"
            )}
            style={{
              left: x - size / 2,
              top: y - size / 2,
              width: size,
              height: size,
            }}
            onClick={onClick}
          >
            {isCluster && count > 1 && count}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          {isCluster && count > 1 ? (
            <div className="text-sm">
              <p className="font-medium">{count} jobs in this area</p>
              <p className="text-muted-foreground text-xs">Click to explore</p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="font-medium">{job.title}</p>
              <p className="text-muted-foreground text-xs flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {job.companyName}
              </p>
              <p className="text-muted-foreground text-xs flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {job.location}
              </p>
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function GlobalJobsMap({
  className,
  initialFilters = {},
  onJobClick,
  showFilters = true,
  showSidebar = true,
  height = "500px",
}: GlobalJobsMapProps) {
  const [filters, setFilters] = React.useState(initialFilters);
  const [selectedJob, setSelectedJob] = React.useState<JobLocation | null>(null);
  const mapRef = React.useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = React.useState({ width: 800, height: 400 });

  const { data, isLoading, error } = useJobLocations({
    employmentType: filters.employmentType,
    companyId: filters.companyId,
    isActive: true,
  });

  // Update dimensions on resize
  React.useEffect(() => {
    const updateDimensions = () => {
      if (mapRef.current) {
        setDimensions({
          width: mapRef.current.offsetWidth,
          height: mapRef.current.offsetHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  const handleJobClick = (job: JobLocation) => {
    setSelectedJob(job);
    onJobClick?.(job);
  };

  if (error) {
    return (
      <div className={cn("flex items-center justify-center bg-muted rounded-lg", className)} style={{ height }}>
        <p className="text-muted-foreground">Failed to load job locations</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={filters.employmentType || "all"}
            onValueChange={(v) =>
              setFilters((f) => ({ ...f, employmentType: v === "all" ? undefined : v }))
            }
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Job Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="fulltime">Full-time</SelectItem>
              <SelectItem value="parttime">Part-time</SelectItem>
              <SelectItem value="contract">Contract</SelectItem>
              <SelectItem value="freelance">Freelance</SelectItem>
              <SelectItem value="internship">Internship</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Briefcase className="h-4 w-4" />
            <span>{data?.totalCount || 0} jobs with locations</span>
          </div>
        </div>
      )}

      <div className="flex gap-4">
        {/* Map Container */}
        <div
          ref={mapRef}
          className={cn(
            "relative bg-muted rounded-lg overflow-hidden flex-1",
            showSidebar ? "w-2/3" : "w-full"
          )}
          style={{ height }}
        >
          {/* World map background - simple SVG outline */}
          <svg
            viewBox="0 0 800 400"
            className="absolute inset-0 w-full h-full opacity-20"
            preserveAspectRatio="xMidYMid slice"
          >
            {/* Simple world outline paths */}
            <path
              d="M0,200 Q100,180 200,190 T400,200 T600,210 T800,200"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-muted-foreground"
            />
          </svg>

          {/* Loading state */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Job dots */}
          {data?.clusters.map((cluster, idx) => {
            const pos = latLngToPosition(
              cluster.latitude,
              cluster.longitude,
              dimensions.width,
              dimensions.height
            );
            const isCluster = cluster.count > 1;
            const job = cluster.jobs[0];

            return (
              <JobDot
                key={`cluster-${idx}`}
                job={job}
                x={pos.x}
                y={pos.y}
                isCluster={isCluster}
                count={cluster.count}
                onClick={() => handleJobClick(job)}
              />
            );
          })}

          {/* Empty state */}
          {!isLoading && data?.totalCount === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <MapPin className="h-12 w-12 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-muted-foreground">No jobs with location data</p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar with job list */}
        {showSidebar && (
          <div className="w-1/3 border rounded-lg overflow-hidden flex flex-col" style={{ height }}>
            <div className="p-3 border-b bg-muted/50">
              <h3 className="font-medium text-sm">Jobs on Map</h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              {data?.jobs.slice(0, 20).map((job) => (
                <button
                  key={job.id}
                  className={cn(
                    "w-full text-left p-3 border-b hover:bg-muted/50 transition-colors",
                    selectedJob?.id === job.id && "bg-muted"
                  )}
                  onClick={() => handleJobClick(job)}
                >
                  <p className="font-medium text-sm truncate">{job.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {job.companyName}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground truncate">
                      {job.location}
                    </span>
                  </div>
                </button>
              ))}
              {(data?.totalCount || 0) > 20 && (
                <div className="p-3 text-center">
                  <Link to="/jobs">
                    <Button variant="outline" size="sm">
                      View all {data?.totalCount} jobs
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Selected job preview */}
      {selectedJob && (
        <div className="p-4 border rounded-lg bg-card">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-medium">{selectedJob.title}</h3>
              <p className="text-sm text-muted-foreground">{selectedJob.companyName}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary">{selectedJob.employmentType}</Badge>
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {selectedJob.location}
                </span>
              </div>
            </div>
            <Link to={`/jobs/${selectedJob.id}`}>
              <Button size="sm">View Job</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
