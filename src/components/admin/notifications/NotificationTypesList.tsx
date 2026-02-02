import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Filter } from "lucide-react";
import { 
  useNotificationTypesWithAssignments, 
  NotificationTypeWithAssignments,
  NOTIFICATION_CATEGORIES 
} from "@/hooks/useNotificationTypes";
import { NotificationTypeCard } from "./NotificationTypeCard";
import { NotificationTypeDialog } from "./NotificationTypeDialog";
import { RecipientAssignmentDialog } from "./RecipientAssignmentDialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function NotificationTypesList() {
  const { data: types, isLoading } = useNotificationTypesWithAssignments();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [editingType, setEditingType] = useState<NotificationTypeWithAssignments | null>(null);
  const [assigningType, setAssigningType] = useState<NotificationTypeWithAssignments | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const filteredTypes = types?.filter((type) => {
    const matchesSearch = 
      type.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      type.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      type.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = 
      selectedCategories.length === 0 || selectedCategories.includes(type.category);
    
    return matchesSearch && matchesCategory;
  });

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // Group by category
  const groupedTypes = filteredTypes?.reduce((acc, type) => {
    if (!acc[type.category]) {
      acc[type.category] = [];
    }
    acc[type.category].push(type);
    return acc;
  }, {} as Record<string, NotificationTypeWithAssignments[]>);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-32" />
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notifications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Filter
                {selectedCategories.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {selectedCategories.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {NOTIFICATION_CATEGORIES.map((category) => (
                <DropdownMenuCheckboxItem
                  key={category.key}
                  checked={selectedCategories.includes(category.key)}
                  onCheckedChange={() => toggleCategory(category.key)}
                >
                  {category.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Type
          </Button>
        </div>
      </div>

      {/* Selected Category Badges */}
      {selectedCategories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedCategories.map((cat) => {
            const category = NOTIFICATION_CATEGORIES.find(c => c.key === cat);
            return (
              <Badge 
                key={cat} 
                variant="secondary"
                className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => toggleCategory(cat)}
              >
                {category?.label || cat} ×
              </Badge>
            );
          })}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setSelectedCategories([])}
            className="text-xs h-6"
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Grouped Notification Types */}
      {groupedTypes && Object.entries(groupedTypes).map(([category, categoryTypes]) => {
        const categoryConfig = NOTIFICATION_CATEGORIES.find(c => c.key === category);
        return (
          <div key={category} className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {categoryConfig?.label || category}
              <span className="ml-2 text-xs font-normal">({categoryTypes.length})</span>
            </h3>
            <div className="space-y-2">
              {categoryTypes.map((type) => (
                <NotificationTypeCard
                  key={type.id}
                  notificationType={type}
                  onEdit={setEditingType}
                  onAssign={setAssigningType}
                />
              ))}
            </div>
          </div>
        );
      })}

      {filteredTypes?.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No notification types found matching your criteria.</p>
        </div>
      )}

      {/* Dialogs */}
      {editingType && (
        <NotificationTypeDialog
          open={true}
          onOpenChange={() => setEditingType(null)}
          notificationType={editingType}
        />
      )}

      {assigningType && (
        <RecipientAssignmentDialog
          open={true}
          onOpenChange={() => setAssigningType(null)}
          notificationType={assigningType}
        />
      )}

      {showCreateDialog && (
        <NotificationTypeDialog
          open={true}
          onOpenChange={() => setShowCreateDialog(false)}
        />
      )}
    </div>
  );
}
