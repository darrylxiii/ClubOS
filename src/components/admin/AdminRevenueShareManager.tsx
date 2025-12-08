import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Percent, DollarSign, Edit2, Trash2, Users } from "lucide-react";
import { motion } from "framer-motion";

interface RevenueShare {
  id: string;
  user_id: string;
  share_type: string;
  share_percentage: number | null;
  share_fixed_amount: number | null;
  applies_to: string;
  min_deal_value: number | null;
  effective_from: string | null;
  effective_to: string | null;
  is_active: boolean;
  created_at: string;
  user_profile?: {
    full_name: string | null;
    email: string | null;
  } | null;
}

export function AdminRevenueShareManager() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingShare, setEditingShare] = useState<RevenueShare | null>(null);
  const queryClient = useQueryClient();

  // Form state
  const [userId, setUserId] = useState("");
  const [shareType, setShareType] = useState("fixed_percentage");
  const [sharePercentage, setSharePercentage] = useState("");
  const [shareFixedAmount, setShareFixedAmount] = useState("");
  const [appliesTo, setAppliesTo] = useState("all_deals");
  const [minDealValue, setMinDealValue] = useState("");

  // Fetch all revenue shares
  const { data: revenueShares, isLoading } = useQuery({
    queryKey: ['admin-revenue-shares'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('referral_revenue_shares')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch user profiles separately
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(s => s.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        return data.map(share => ({
          ...share,
          user_profile: profileMap.get(share.user_id) || null
        })) as RevenueShare[];
      }
      
      return data as RevenueShare[];
    }
  });

  // Fetch users for selection
  const { data: users } = useQuery({
    queryKey: ['admin-users-for-shares'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');

      if (error) throw error;
      return data;
    }
  });

  // Create/update mutation
  const saveMutation = useMutation({
    mutationFn: async (shareData: {
      user_id: string;
      share_type: string;
      share_percentage: number | null;
      share_fixed_amount: number | null;
      applies_to: string;
      min_deal_value: number | null;
      is_active: boolean;
    }) => {
      if (editingShare) {
        const { error } = await supabase
          .from('referral_revenue_shares')
          .update(shareData)
          .eq('id', editingShare.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('referral_revenue_shares')
          .insert(shareData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-revenue-shares'] });
      toast.success(editingShare ? 'Revenue share updated' : 'Revenue share created');
      resetForm();
      setDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    }
  });

  // Toggle active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('referral_revenue_shares')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-revenue-shares'] });
      toast.success('Status updated');
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('referral_revenue_shares')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-revenue-shares'] });
      toast.success('Revenue share deleted');
    }
  });

  const resetForm = () => {
    setUserId("");
    setShareType("fixed_percentage");
    setSharePercentage("");
    setShareFixedAmount("");
    setAppliesTo("all_deals");
    setMinDealValue("");
    setEditingShare(null);
  };

  const handleEdit = (share: RevenueShare) => {
    setEditingShare(share);
    setUserId(share.user_id);
    setShareType(share.share_type);
    setSharePercentage(share.share_percentage?.toString() || "");
    setShareFixedAmount(share.share_fixed_amount?.toString() || "");
    setAppliesTo(share.applies_to);
    setMinDealValue(share.min_deal_value?.toString() || "");
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!userId) {
      toast.error('Please select a user');
      return;
    }

    saveMutation.mutate({
      user_id: userId,
      share_type: shareType,
      share_percentage: sharePercentage ? parseFloat(sharePercentage) : null,
      share_fixed_amount: shareFixedAmount ? parseFloat(shareFixedAmount) : null,
      applies_to: appliesTo,
      min_deal_value: minDealValue ? parseFloat(minDealValue) : null,
      is_active: true,
    });
  };

  const getShareDisplay = (share: RevenueShare) => {
    if (share.share_type === 'fixed_percentage' && share.share_percentage) {
      return `${share.share_percentage}%`;
    }
    if (share.share_type === 'per_placement' && share.share_fixed_amount) {
      return `€${share.share_fixed_amount.toLocaleString()}`;
    }
    return '-';
  };

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Revenue Share Configuration
          </CardTitle>
          <CardDescription>
            Configure commission percentages and fixed amounts for team members
          </CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Revenue Share
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingShare ? 'Edit Revenue Share' : 'Create Revenue Share'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>User</Label>
                <Select value={userId} onValueChange={setUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select user..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users?.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Share Type</Label>
                <Select value={shareType} onValueChange={setShareType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed_percentage">
                      <span className="flex items-center gap-2">
                        <Percent className="h-4 w-4" />
                        Percentage of Revenue
                      </span>
                    </SelectItem>
                    <SelectItem value="per_placement">
                      <span className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Fixed Amount per Placement
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {shareType === 'fixed_percentage' && (
                <div className="space-y-2">
                  <Label>Percentage (%)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={sharePercentage}
                    onChange={(e) => setSharePercentage(e.target.value)}
                    placeholder="e.g., 5"
                  />
                </div>
              )}

              {shareType === 'per_placement' && (
                <div className="space-y-2">
                  <Label>Fixed Amount (€)</Label>
                  <Input
                    type="number"
                    step="100"
                    min="0"
                    value={shareFixedAmount}
                    onChange={(e) => setShareFixedAmount(e.target.value)}
                    placeholder="e.g., 1000"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Applies To</Label>
                <Select value={appliesTo} onValueChange={setAppliesTo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_deals">All Deals</SelectItem>
                    <SelectItem value="self_sourced">Self-Sourced Only</SelectItem>
                    <SelectItem value="referred">Referred Candidates</SelectItem>
                    <SelectItem value="member_referrals">Member Referrals</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Minimum Deal Value (€) - Optional</Label>
                <Input
                  type="number"
                  step="1000"
                  min="0"
                  value={minDealValue}
                  onChange={(e) => setMinDealValue(e.target.value)}
                  placeholder="No minimum"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
                  {editingShare ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted/50 rounded animate-pulse" />
            ))}
          </div>
        ) : !revenueShares?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            No revenue shares configured yet
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Share</TableHead>
                <TableHead>Applies To</TableHead>
                <TableHead>Min. Deal</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {revenueShares.map((share) => (
                <motion.tr
                  key={share.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border-b"
                >
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {share.user_profile?.full_name || 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {share.user_profile?.email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {share.share_type === 'fixed_percentage' ? 'Percentage' : 'Fixed'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold">
                    {getShareDisplay(share)}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm capitalize">
                      {share.applies_to.replace(/_/g, ' ')}
                    </span>
                  </TableCell>
                  <TableCell>
                    {share.min_deal_value 
                      ? `€${share.min_deal_value.toLocaleString()}`
                      : '-'
                    }
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={share.is_active}
                      onCheckedChange={(checked) => 
                        toggleActiveMutation.mutate({ id: share.id, is_active: checked })
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(share)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm('Delete this revenue share?')) {
                            deleteMutation.mutate(share.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
