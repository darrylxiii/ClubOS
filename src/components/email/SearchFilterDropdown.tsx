import { useState } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export interface SearchOperators {
  from?: string;
  to?: string;
  subject?: string;
  has?: ("attachment" | "star")[];
  is?: ("read" | "unread" | "starred")[];
}

interface SearchFilterDropdownProps {
  currentOperators: SearchOperators;
  onApply: (operators: SearchOperators) => void;
  onClear: () => void;
}

export function SearchFilterDropdown({
  currentOperators,
  onApply,
  onClear,
}: SearchFilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const [localOperators, setLocalOperators] = useState<SearchOperators>(currentOperators);

  const handleApply = () => {
    onApply(localOperators);
    setOpen(false);
  };

  const handleClear = () => {
    setLocalOperators({});
    onClear();
    setOpen(false);
  };

  const toggleArrayValue = <T extends string>(
    key: "has" | "is",
    value: T
  ) => {
    const current = (localOperators[key] || []) as T[];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    
    setLocalOperators({
      ...localOperators,
      [key]: updated.length > 0 ? updated : undefined,
    });
  };

  const hasActiveFilters = Object.values(currentOperators).some(
    (v) => v !== undefined && (Array.isArray(v) ? v.length > 0 : true)
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={hasActiveFilters ? "default" : "outline"}
          size="sm"
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <span className="ml-1 rounded-full bg-background/20 px-1.5 py-0.5 text-xs">
              {Object.values(currentOperators).filter((v) => 
                v !== undefined && (Array.isArray(v) ? v.length > 0 : true)
              ).length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[360px] p-0" 
        align="start"
        sideOffset={8}
      >
        <div className="flex items-center justify-between p-4 pb-3">
          <h3 className="font-semibold text-sm">Search Filters</h3>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear all
            </Button>
          )}
        </div>
        
        <Separator />
        
        <ScrollArea className="h-[400px]">
          <div className="space-y-4 p-4">
            {/* From */}
            <div className="space-y-2">
              <Label htmlFor="from" className="text-xs font-semibold">
                From
              </Label>
              <Input
                id="from"
                placeholder="sender@example.com"
                value={localOperators.from || ""}
                onChange={(e) =>
                  setLocalOperators({
                    ...localOperators,
                    from: e.target.value || undefined,
                  })
                }
                className="h-8 text-sm"
              />
            </div>

            {/* To */}
            <div className="space-y-2">
              <Label htmlFor="to" className="text-xs font-semibold">
                To
              </Label>
              <Input
                id="to"
                placeholder="recipient@example.com"
                value={localOperators.to || ""}
                onChange={(e) =>
                  setLocalOperators({
                    ...localOperators,
                    to: e.target.value || undefined,
                  })
                }
                className="h-8 text-sm"
              />
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="subject" className="text-xs font-semibold">
                Subject
              </Label>
              <Input
                id="subject"
                placeholder="Keywords in subject..."
                value={localOperators.subject || ""}
                onChange={(e) =>
                  setLocalOperators({
                    ...localOperators,
                    subject: e.target.value || undefined,
                  })
                }
                className="h-8 text-sm"
              />
            </div>

            <Separator />

            {/* Status */}
            <div className="space-y-3">
              <Label className="text-xs font-semibold">Status</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="unread"
                    checked={localOperators.is?.includes("unread")}
                    onCheckedChange={() => toggleArrayValue("is", "unread")}
                  />
                  <label
                    htmlFor="unread"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Unread
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="read"
                    checked={localOperators.is?.includes("read")}
                    onCheckedChange={() => toggleArrayValue("is", "read")}
                  />
                  <label
                    htmlFor="read"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Read
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="starred"
                    checked={localOperators.is?.includes("starred")}
                    onCheckedChange={() => toggleArrayValue("is", "starred")}
                  />
                  <label
                    htmlFor="starred"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Starred
                  </label>
                </div>
              </div>
            </div>

            <Separator />

            {/* Has */}
            <div className="space-y-3">
              <Label className="text-xs font-semibold">Contains</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="attachment"
                    checked={localOperators.has?.includes("attachment")}
                    onCheckedChange={() => toggleArrayValue("has", "attachment")}
                  />
                  <label
                    htmlFor="attachment"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Has Attachment
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="star"
                    checked={localOperators.has?.includes("star")}
                    onCheckedChange={() => toggleArrayValue("has", "star")}
                  />
                  <label
                    htmlFor="star"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Has Star
                  </label>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <Separator />

        <div className="flex items-center justify-end gap-2 p-4 pt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={handleApply}>
            Apply Filters
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
