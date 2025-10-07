import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { TrendingUp, Hash, Copy, Plus } from "lucide-react";
import { toast } from "sonner";

export const HashtagManager = () => {
  const trendingHashtags = [
    { tag: "AI", count: 45200, trending: 15 },
    { tag: "TechJobs", count: 32100, trending: 8 },
    { tag: "RemoteWork", count: 28900, trending: 12 },
    { tag: "Hiring", count: 25600, trending: 5 },
    { tag: "Career", count: 19800, trending: -2 }
  ];

  const savedSets = [
    {
      name: "Tech Recruitment",
      hashtags: ["TechJobs", "Hiring", "RemoteWork", "AI", "Developer"]
    },
    {
      name: "Company Culture",
      hashtags: ["WorkCulture", "TeamWork", "Innovation", "Growth"]
    }
  ];

  const copyHashtags = (hashtags: string[]) => {
    const text = hashtags.map(h => `#${h}`).join(" ");
    navigator.clipboard.writeText(text);
    toast.success("Hashtags copied to clipboard!");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Trending Hashtags */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Trending Hashtags
          </h3>
          <Button variant="outline" size="sm">Refresh</Button>
        </div>

        <div className="space-y-3">
          {trendingHashtags.map((item) => (
            <Card key={item.tag} className="p-4 bg-card/50 hover:bg-card/80 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <Hash className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">#{item.tag}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.count.toLocaleString()} posts
                    </p>
                  </div>
                </div>
                <Badge variant={item.trending > 0 ? "default" : "secondary"} className="gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {item.trending > 0 ? "+" : ""}{item.trending}%
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      {/* Saved Hashtag Sets */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Saved Hashtag Sets</h3>
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            New Set
          </Button>
        </div>

        <div className="space-y-4">
          {savedSets.map((set) => (
            <Card key={set.name} className="p-4 bg-card/50">
              <div className="flex items-start justify-between mb-3">
                <h4 className="font-semibold">{set.name}</h4>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => copyHashtags(set.hashtags)}
                  className="gap-2"
                >
                  <Copy className="h-3 w-3" />
                  Copy
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {set.hashtags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    #{tag}
                  </Badge>
                ))}
              </div>
            </Card>
          ))}
        </div>

        {/* Create New Set */}
        <Card className="p-4 bg-card/50 mt-4">
          <h4 className="font-semibold mb-3">Create Custom Set</h4>
          <Input placeholder="Enter hashtags separated by commas..." className="mb-3" />
          <Button className="w-full">Save Hashtag Set</Button>
        </Card>
      </Card>
    </div>
  );
};