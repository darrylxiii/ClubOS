import { useState, memo, useMemo } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface Tool {
  id: string;
  name: string;
  slug: string;
  category: string;
  logo_url: string | null;
}

interface ToolSelectorProps {
  selectedTools: Tool[];
  onChange: (tools: Tool[]) => void;
  placeholder?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  all: "All Categories",
  project_management: "Project Management",
  communication: "Communication",
  design: "Design",
  development: "Development",
  language: "Languages & Frameworks",
  database: "Databases",
  cloud: "Cloud & Infrastructure",
  analytics: "Analytics & BI",
  crm: "CRM & Sales",
  marketing: "Marketing",
  other: "Other",
};

export const ToolSelector = memo(function ToolSelector({ selectedTools, onChange, placeholder = "Search tools..." }: ToolSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isOpen, setIsOpen] = useState(false);

  const { data: allTools = [] } = useQuery({
    queryKey: ["tools-and-skills"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tools_and_skills")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data as Tool[];
    },
  });

  const filteredTools = allTools.filter((tool) => {
    const matchesSearch = tool.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || tool.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleTool = (tool: Tool) => {
    const isSelected = selectedTools.some((t) => t.id === tool.id);
    if (isSelected) {
      onChange(selectedTools.filter((t) => t.id !== tool.id));
    } else {
      onChange([...selectedTools, tool]);
    }
  };

  const removeTool = (toolId: string) => {
    onChange(selectedTools.filter((t) => t.id !== toolId));
  };

  return (
    <div className="space-y-3">
      {/* Search and Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className="pl-9"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Search Results Dropdown */}
      {isOpen && searchQuery && (
        <div className="relative">
          <div className="absolute z-50 w-full max-h-64 overflow-y-auto border-2 rounded-xl bg-background shadow-lg">
            {filteredTools.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">
                No tools found. Try a different search term.
              </div>
            ) : (
              filteredTools.map((tool) => {
                const isSelected = selectedTools.some((t) => t.id === tool.id);
                return (
                  <div
                    key={tool.id}
                    className="flex items-center gap-3 p-3 hover:bg-accent cursor-pointer border-b last:border-b-0"
                    onClick={() => toggleTool(tool)}
                  >
                    <Checkbox 
                      checked={isSelected}
                      onCheckedChange={() => {}}
                      className="pointer-events-none"
                    />
                    {tool.logo_url && (
                      <img
                        src={tool.logo_url}
                        alt={tool.name}
                        className="w-6 h-6 object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    )}
                    <div className="flex-1">
                      <div className="font-medium">{tool.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {CATEGORY_LABELS[tool.category] || tool.category}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
        </div>
      )}

      {/* Selected Tools Badges */}
      {selectedTools.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 border-2 rounded-xl bg-accent/5">
          {selectedTools.map((tool) => (
            <Badge
              key={tool.id}
              variant="secondary"
              className="flex items-center gap-2 pl-2 pr-1 py-1.5"
            >
              {tool.logo_url && (
                <img
                  src={tool.logo_url}
                  alt={tool.name}
                  className="w-4 h-4 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              )}
              <span>{tool.name}</span>
              <X
                className="w-3 h-3 cursor-pointer hover:text-destructive"
                onClick={() => removeTool(tool.id)}
              />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if tool IDs or placeholder change
  const prevIds = prevProps.selectedTools.map(t => t.id).sort().join(',');
  const nextIds = nextProps.selectedTools.map(t => t.id).sort().join(',');
  return prevIds === nextIds && prevProps.placeholder === nextProps.placeholder;
});
