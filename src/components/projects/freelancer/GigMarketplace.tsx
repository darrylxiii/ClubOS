import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, Filter, Star, Clock, CheckCircle2, 
  Heart, Sparkles, TrendingUp, ArrowUpRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const GIG_CATEGORIES = [
  "All Categories",
  "Web Development",
  "Mobile Apps",
  "UI/UX Design",
  "Data Science",
  "Marketing",
  "Content Writing",
  "Video Production",
];

interface Gig {
  id: string;
  title: string;
  description: string;
  category: string;
  starting_price: number;
  delivery_days: number;
  freelancer: {
    id: string;
    full_name: string;
    avatar_url: string;
    freelance_profile: {
      avg_project_rating: number;
      total_completed_projects: number;
      talent_level: string;
    };
  };
  gallery_images: string[];
  order_count: number;
  avg_rating: number;
  is_featured: boolean;
}

export function GigMarketplace() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [sortBy, setSortBy] = useState("recommended");

  const { data: gigs, isLoading } = useQuery({
    queryKey: ["marketplace-gigs", searchQuery, selectedCategory, sortBy],
    queryFn: async () => {
      let query = (supabase as any)
        .from("freelancer_gigs")
        .select(`
          *,
          freelancer:profiles!freelancer_gigs_freelancer_id_fkey(
            id, full_name, avatar_url
          )
        `)
        .eq("is_active", true);

      if (selectedCategory !== "All Categories") {
        query = query.eq("category", selectedCategory);
      }

      if (searchQuery) {
        query = query.ilike("title", `%${searchQuery}%`);
      }

      const { data, error } = await query.limit(20);
      if (error) throw error;
      return data || [];
    },
  });

  const getTalentBadge = (level: string) => {
    switch (level) {
      case "top_rated_plus":
        return <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">Top Rated Plus</Badge>;
      case "top_rated":
        return <Badge className="bg-gradient-to-r from-primary to-primary/80">Top Rated</Badge>;
      case "rising_star":
        return <Badge variant="secondary">Rising Star</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Gig Marketplace
          </h2>
          <p className="text-muted-foreground">
            Browse packaged services from verified freelancers
          </p>
        </div>

        <Button onClick={() => navigate("/projects/gigs/create")}>
          Create Your Gig
        </Button>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search gigs..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GIG_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recommended">Recommended</SelectItem>
                <SelectItem value="best_selling">Best Selling</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="price_low">Price: Low to High</SelectItem>
                <SelectItem value="price_high">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Gigs Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-48 bg-muted" />
              <CardContent className="pt-4 space-y-3">
                <div className="h-4 bg-muted rounded" />
                <div className="h-4 bg-muted rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : gigs && gigs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {gigs.map((gig: any) => (
            <GigCard key={gig.id} gig={gig} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Gigs Found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || selectedCategory !== "All Categories"
                ? "Try adjusting your search or filters"
                : "Be the first to create a gig!"}
            </p>
            <Button onClick={() => navigate("/projects/gigs/create")}>
              Create a Gig
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function GigCard({ gig }: { gig: any }) {
  const navigate = useNavigate();
  const [isSaved, setIsSaved] = useState(false);

  return (
    <Card 
      className="group overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300"
      onClick={() => navigate(`/projects/gigs/${gig.id}`)}
    >
      {/* Image */}
      <div className="relative h-48 bg-muted overflow-hidden">
        {gig.gallery_images?.[0] ? (
          <img
            src={gig.gallery_images[0]}
            alt={gig.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <Sparkles className="h-12 w-12 text-primary/40" />
          </div>
        )}

        {/* Save Button */}
        <button
          className="absolute top-3 right-3 p-2 bg-background/80 backdrop-blur rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            setIsSaved(!isSaved);
          }}
        >
          <Heart className={`h-4 w-4 ${isSaved ? "fill-red-500 text-red-500" : ""}`} />
        </button>

        {/* Featured Badge */}
        {gig.is_featured && (
          <Badge className="absolute top-3 left-3 bg-gradient-to-r from-amber-500 to-orange-500">
            <TrendingUp className="h-3 w-3 mr-1" />
            Featured
          </Badge>
        )}
      </div>

      <CardContent className="pt-4 space-y-3">
        {/* Freelancer Info */}
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={gig.freelancer?.avatar_url} />
            <AvatarFallback>
              {gig.freelancer?.full_name?.charAt(0) || "F"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {gig.freelancer?.full_name}
            </p>
          </div>
        </div>

        {/* Title */}
        <h3 className="font-medium line-clamp-2 group-hover:text-primary transition-colors">
          {gig.title}
        </h3>

        {/* Rating */}
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          <span className="font-medium">{gig.avg_rating?.toFixed(1) || "New"}</span>
          {gig.order_count > 0 && (
            <span className="text-muted-foreground text-sm">
              ({gig.order_count} orders)
            </span>
          )}
        </div>

        {/* Price */}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-xs text-muted-foreground">Starting at</span>
          <span className="text-lg font-bold">
            €{gig.starting_price || gig.basic_price}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
