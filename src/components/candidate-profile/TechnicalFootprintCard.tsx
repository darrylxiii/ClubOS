import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Github, Star, GitFork, Code, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  githubData: any;
}

export const TechnicalFootprintCard = ({ githubData }: Props) => {
  if (!githubData || !githubData.found) {
    return (
      <Card className="bg-card/90 backdrop-blur-xl border border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Github className="w-4 h-4" />
            Technical Footprint
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {githubData?.searched_at
              ? "No GitHub profile found for this candidate."
              : "GitHub profile not yet scanned."}
          </p>
        </CardContent>
      </Card>
    );
  }

  const { username, public_repos, followers, total_stars, top_languages, pinned_repos, bio } = githubData;

  return (
    <Card className="bg-card/90 backdrop-blur-xl border border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Github className="w-4 h-4" />
            Technical Footprint
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <a href={`https://github.com/${username}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3 h-3 mr-1" />
              @{username}
            </a>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <p className="text-lg font-bold tabular-nums">{public_repos || 0}</p>
            <p className="text-[11px] text-muted-foreground">Repos</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <p className="text-lg font-bold tabular-nums">{total_stars || 0}</p>
            <p className="text-[11px] text-muted-foreground">Stars</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <p className="text-lg font-bold tabular-nums">{followers || 0}</p>
            <p className="text-[11px] text-muted-foreground">Followers</p>
          </div>
        </div>

        {/* Bio */}
        {bio && (
          <p className="text-xs text-muted-foreground">{bio}</p>
        )}

        {/* Top Languages */}
        {top_languages?.length > 0 && (
          <div>
            <p className="text-[11px] text-muted-foreground mb-1.5">Top Languages</p>
            <div className="flex flex-wrap gap-1">
              {top_languages.slice(0, 8).map((lang: string, i: number) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  <Code className="w-3 h-3 mr-1" />
                  {lang}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Pinned Repos */}
        {pinned_repos?.length > 0 && (
          <div>
            <p className="text-[11px] text-muted-foreground mb-1.5">Notable Repositories</p>
            <div className="space-y-2">
              {pinned_repos.slice(0, 4).map((repo: any, i: number) => (
                <a
                  key={i}
                  href={repo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-2 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{repo.name}</span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {repo.language && <span>{repo.language}</span>}
                      <span className="flex items-center gap-0.5">
                        <Star className="w-3 h-3" />
                        {repo.stars}
                      </span>
                    </div>
                  </div>
                  {repo.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{repo.description}</p>
                  )}
                </a>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
