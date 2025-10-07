import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Globe, Users, Building2, Heart, List, Info } from "lucide-react";
import { AudienceSelection, AudienceType } from "./AudiencePickerButton";
import { CustomListSelector } from "./CustomListSelector";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

interface AudiencePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  value: AudienceSelection;
  onChange: (selection: AudienceSelection) => void;
}

export const AudiencePickerModal = ({ isOpen, onClose, value, onChange }: AudiencePickerModalProps) => {
  const [selectedType, setSelectedType] = useState<AudienceType>(value.type);
  const [selectedListIds, setSelectedListIds] = useState<string[]>(value.customListIds || []);
  const [multiSelect, setMultiSelect] = useState({
    company: value.multiSelect?.company || false,
    connections: value.multiSelect?.connections || false,
    bestFriends: value.multiSelect?.bestFriends || false,
  });
  const [estimatedReach, setEstimatedReach] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      calculateEstimatedReach();
    }
  }, [selectedType, selectedListIds, multiSelect, isOpen]);

  const calculateEstimatedReach = async () => {
    // Calculate estimated audience size
    let count = 0;

    if (selectedType === 'public') {
      // Get total user count (simplified)
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      count = totalUsers || 0;
    } else if (selectedType === 'connections') {
      // Count connections (you'd implement actual connection logic)
      count = 50; // Placeholder
    } else if (selectedType === 'company_internal') {
      // Count company members
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (profile?.company_id) {
        const { count: companyMembers } = await supabase
          .from('company_members')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', profile.company_id)
          .eq('is_active', true);
        count = companyMembers || 0;
      }
    } else if (selectedType === 'best_friends') {
      const { count: friendsCount } = await supabase
        .from('best_friends')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);
      count = friendsCount || 0;
    } else if (selectedType === 'custom' && selectedListIds.length > 0) {
      const { count: membersCount } = await supabase
        .from('audience_list_members')
        .select('*', { count: 'exact', head: true })
        .in('list_id', selectedListIds);
      count = membersCount || 0;
    }

    setEstimatedReach(count);
  };

  const handleSave = () => {
    onChange({
      type: selectedType,
      customListIds: selectedType === 'custom' ? selectedListIds : undefined,
      multiSelect: multiSelect.company || multiSelect.connections || multiSelect.bestFriends 
        ? multiSelect 
        : undefined,
    });
    onClose();
  };

  const audienceOptions = [
    {
      value: 'connections' as AudienceType,
      label: 'Connections Only',
      description: 'Your Quantum Club connections',
      icon: Users,
    },
    {
      value: 'company_internal' as AudienceType,
      label: 'Internal (Company)',
      description: 'Only visible to your company members',
      icon: Building2,
    },
    {
      value: 'best_friends' as AudienceType,
      label: 'Best Friends',
      description: 'Your most trusted contacts',
      icon: Heart,
    },
    {
      value: 'custom' as AudienceType,
      label: 'Custom Lists',
      description: 'Select from your saved lists',
      icon: List,
    },
    {
      value: 'public' as AudienceType,
      label: 'Public',
      description: 'All club members',
      icon: Globe,
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-background/95 backdrop-blur-xl border-white/10">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Choose Your Audience</DialogTitle>
          <DialogDescription>
            Select who can see this post. You can combine multiple audiences for more control.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <RadioGroup value={selectedType} onValueChange={(v) => setSelectedType(v as AudienceType)}>
            <div className="space-y-3">
              {audienceOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <div
                    key={option.value}
                    className="flex items-start space-x-3 p-4 rounded-xl border border-border hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedType(option.value)}
                  >
                    <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                    <Icon className="w-5 h-5 mt-0.5 text-primary" />
                    <div className="flex-1 space-y-1">
                      <Label
                        htmlFor={option.value}
                        className="text-base font-semibold cursor-pointer"
                      >
                        {option.label}
                      </Label>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </RadioGroup>

          {selectedType === 'custom' && (
            <div className="space-y-4">
              <Separator />
              <CustomListSelector
                selectedIds={selectedListIds}
                onSelectionChange={setSelectedListIds}
              />
            </div>
          )}

          <Separator />

          <div className="space-y-4">
            <h4 className="font-semibold text-sm">Multi-Select Options (Optional)</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-accent/30">
                <Checkbox
                  id="multi-company"
                  checked={multiSelect.company}
                  onCheckedChange={(checked) =>
                    setMultiSelect({ ...multiSelect, company: checked as boolean })
                  }
                />
                <Label htmlFor="multi-company" className="flex-1 cursor-pointer">
                  <span className="font-medium">+ Company</span>
                  <p className="text-sm text-muted-foreground">Also share with company members</p>
                </Label>
              </div>

              <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-accent/30">
                <Checkbox
                  id="multi-connections"
                  checked={multiSelect.connections}
                  onCheckedChange={(checked) =>
                    setMultiSelect({ ...multiSelect, connections: checked as boolean })
                  }
                />
                <Label htmlFor="multi-connections" className="flex-1 cursor-pointer">
                  <span className="font-medium">+ Connections</span>
                  <p className="text-sm text-muted-foreground">Include all your connections</p>
                </Label>
              </div>

              <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-accent/30">
                <Checkbox
                  id="multi-best-friends"
                  checked={multiSelect.bestFriends}
                  onCheckedChange={(checked) =>
                    setMultiSelect({ ...multiSelect, bestFriends: checked as boolean })
                  }
                />
                <Label htmlFor="multi-best-friends" className="flex-1 cursor-pointer">
                  <span className="font-medium">+ Best Friends</span>
                  <p className="text-sm text-muted-foreground">Include your best friends</p>
                </Label>
              </div>
            </div>
          </div>

          <Alert className="bg-primary/10 border-primary/20">
            <Info className="w-4 h-4" />
            <AlertDescription>
              <strong>Estimated reach:</strong> ~{estimatedReach} {estimatedReach === 1 ? 'person' : 'people'} will see this post
            </AlertDescription>
          </Alert>
        </div>

        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} className="flex-1">
            Confirm Audience
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};