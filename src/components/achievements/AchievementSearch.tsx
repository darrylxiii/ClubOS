import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Search, Filter } from "lucide-react";

interface SearchProps {
  onSearchChange: (query: string) => void;
  onCategoryChange: (category: string | null) => void;
  onRarityChange: (rarity: string | null) => void;
}

export const AchievementSearch = ({
  onSearchChange,
  onCategoryChange,
  onRarityChange,
}: SearchProps) => {
  return (
    <Card className="glass p-4">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search achievements..."
            className="pl-10"
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <Select onValueChange={(value) => onCategoryChange(value === "all" ? null : value)}>
          <SelectTrigger className="w-full md:w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="influence">Influence</SelectItem>
            <SelectItem value="innovation">Innovation</SelectItem>
            <SelectItem value="social">Social</SelectItem>
            <SelectItem value="learning">Learning</SelectItem>
            <SelectItem value="prestige">Prestige</SelectItem>
            <SelectItem value="event">Event</SelectItem>
            <SelectItem value="pioneer">Pioneer</SelectItem>
          </SelectContent>
        </Select>

        <Select onValueChange={(value) => onRarityChange(value === "all" ? null : value)}>
          <SelectTrigger className="w-full md:w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Rarity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Rarities</SelectItem>
            <SelectItem value="common">Common</SelectItem>
            <SelectItem value="rare">Rare</SelectItem>
            <SelectItem value="epic">Epic</SelectItem>
            <SelectItem value="legendary">Legendary</SelectItem>
            <SelectItem value="quantum">Quantum</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </Card>
  );
};
