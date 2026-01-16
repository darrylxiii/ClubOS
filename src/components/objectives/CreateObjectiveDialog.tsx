import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Calendar as CalendarIcon, X, UserPlus } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface CreateObjectiveDialogProps {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export const CreateObjectiveDialog = ({ children, open, onOpenChange, onCreated }: CreateObjectiveDialogProps) => {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [goals, setGoals] = useState("");
  const [priority, setPriority] = useState("medium");
  const [milestoneType, setMilestoneType] = useState("");
  const [startDate, setStartDate] = useState<Date>();
  const [dueDate, setDueDate] = useState<Date>();
  const [hardDeadline, setHardDeadline] = useState<Date>();
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedOwners, setSelectedOwners] = useState<string[]>([]);
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([]);
  const [showOwnerSelector, setShowOwnerSelector] = useState(false);

  useEffect(() => {
    if (open) {
      loadUsers();
      if (user) {
        setSelectedOwners([user.id]);
      }
    }
  }, [open, user]);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .order("full_name");

      if (error) throw error;
      setAvailableUsers(data || []);
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const toggleOwner = (userId: string) => {
    setSelectedOwners(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("club_objectives").insert({
        title: title.trim(),
        description: description.trim() || null,
        goals: goals.trim() || null,
        status: "pending",
        priority,
        milestone_type: milestoneType.trim() || null,
        start_date: startDate?.toISOString(),
        due_date: dueDate?.toISOString(),
        hard_deadline: hardDeadline?.toISOString(),
        tags: tags.length > 0 ? tags : null,
        owners: selectedOwners.length > 0 ? selectedOwners : [user.id],
        created_by: user.id,
      });

      if (error) throw error;

      toast.success("Objective created successfully");
      onCreated();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error("Error creating objective:", error);
      toast.error("Failed to create objective");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setGoals("");
    setPriority("medium");
    setMilestoneType("");
    setStartDate(undefined);
    setDueDate(undefined);
    setHardDeadline(undefined);
    setTags([]);
    setTagInput("");
    setSelectedOwners(user ? [user.id] : []);
    setShowOwnerSelector(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Objective</DialogTitle>
          <DialogDescription>
            Define a new project objective with goals, timeline, and owners.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Launch Product V2.0"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the objective and its context..."
              rows={3}
            />
          </div>

          {/* Goals */}
          <div className="space-y-2">
            <Label htmlFor="goals">Goals & Success Criteria</Label>
            <Textarea
              id="goals"
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              placeholder="Define what success looks like for this objective..."
              rows={3}
            />
          </div>

          {/* Priority and Milestone Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="milestone">Milestone Type</Label>
              <Input
                id="milestone"
                value={milestoneType}
                onChange={(e) => setMilestoneType(e.target.value)}
                placeholder="e.g., Q1 Launch"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus className="pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dueDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus className="pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Hard Deadline</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !hardDeadline && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {hardDeadline ? format(hardDeadline, "PPP") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={hardDeadline} onSelect={setHardDeadline} initialFocus className="pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <div className="flex gap-2">
              <Input
                id="tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="Add tags (press Enter)"
              />
              <Button type="button" onClick={handleAddTag} variant="secondary">
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => handleRemoveTag(tag)} />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Owners */}
          <div className="space-y-2">
            <Label>Objective Owners</Label>
            <div className="space-y-3">
              {/* Selected Owners */}
              {selectedOwners.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {availableUsers
                    .filter(u => selectedOwners.includes(u.id))
                    .map((owner) => (
                      <Badge key={owner.id} variant="secondary" className="gap-2 pr-1">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={owner.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {owner.full_name?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span>{owner.full_name}</span>
                        <X 
                          className="h-3 w-3 cursor-pointer hover:text-destructive" 
                          onClick={() => toggleOwner(owner.id)} 
                        />
                      </Badge>
                    ))}
                </div>
              )}
              
              {/* Add Owner Button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowOwnerSelector(!showOwnerSelector)}
                className="gap-2"
              >
                <UserPlus className="h-4 w-4" />
                {showOwnerSelector ? "Hide Users" : "Add Owners"}
              </Button>

              {/* Owner Selection */}
              {showOwnerSelector && (
                <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                  {availableUsers.map((profile) => (
                    <div key={profile.id} className="flex items-center gap-3 p-2 hover:bg-accent rounded cursor-pointer" onClick={() => toggleOwner(profile.id)}>
                      <Checkbox checked={selectedOwners.includes(profile.id)} />
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={profile.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {profile.full_name?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{profile.full_name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Objective"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
