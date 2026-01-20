import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useWhatsAppAccounts, useManageWhatsAppAccount, WhatsAppAccount } from '@/hooks/useWhatsAppAccounts';
import { 
  Plus, 
  Phone, 
  Star, 
  StarOff,
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  Loader2,
  Settings,
  Zap
} from 'lucide-react';

export function WhatsAppAccountsTab() {
  const { data: accounts, isLoading } = useWhatsAppAccounts();
  const { createAccount, deleteAccount, setPrimary, verifyConnection, updateAccount } = useManageWhatsAppAccount();
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<WhatsAppAccount | null>(null);
  const [newAccountData, setNewAccountData] = useState({
    phone_number_id: '',
    business_account_id: '',
    display_phone_number: '',
    account_label: '',
  });

  const handleAddAccount = async () => {
    await createAccount.mutateAsync(newAccountData);
    setShowAddDialog(false);
    setNewAccountData({
      phone_number_id: '',
      business_account_id: '',
      display_phone_number: '',
      account_label: '',
    });
  };

  const handleDeleteConfirm = async () => {
    if (selectedAccount) {
      await deleteAccount.mutateAsync(selectedAccount.id);
      setShowDeleteDialog(false);
      setSelectedAccount(null);
    }
  };

  const handleToggleActive = async (account: WhatsAppAccount) => {
    await updateAccount.mutateAsync({
      account_id: account.id,
      is_active: !account.is_active,
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">WhatsApp Accounts</h2>
          <p className="text-sm text-muted-foreground">Manage your connected WhatsApp Business accounts</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Account
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          </CardContent>
        </Card>
      ) : accounts?.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Phone className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-medium mb-2">No WhatsApp Accounts</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add your first WhatsApp Business account to start messaging
            </p>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {accounts?.map((account) => (
            <Card key={account.id} className={account.is_primary ? 'border-primary' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      account.is_active ? 'bg-green-500/10' : 'bg-muted'
                    }`}>
                      <Phone className={`h-5 w-5 ${account.is_active ? 'text-green-500' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{account.display_phone_number}</span>
                        {account.is_primary && (
                          <Badge variant="default" className="text-xs">Primary</Badge>
                        )}
                        {account.is_active ? (
                          <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {account.account_label || account.verified_name || 'WhatsApp Business'}
                      </p>
                      {account.verification_status === 'verified' && (
                        <p className="text-xs text-green-600 mt-1">
                          <CheckCircle className="h-3 w-3 inline mr-1" />
                          Verified {account.last_verified_at ? new Date(account.last_verified_at).toLocaleDateString() : ''}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => verifyConnection.mutateAsync(account.id)}
                      disabled={verifyConnection.isPending}
                      title="Verify Connection"
                    >
                      {verifyConnection.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                    {!account.is_primary && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setPrimary.mutateAsync(account.id)}
                        disabled={setPrimary.isPending}
                        title="Set as Primary"
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleActive(account)}
                      disabled={updateAccount.isPending}
                      title={account.is_active ? 'Deactivate' : 'Activate'}
                    >
                      <Zap className={`h-4 w-4 ${account.is_active ? 'text-green-500' : ''}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedAccount(account);
                        setShowDeleteDialog(true);
                      }}
                      className="text-destructive hover:text-destructive"
                      title="Delete Account"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Account Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add WhatsApp Account</DialogTitle>
            <DialogDescription>
              Enter your WhatsApp Business API credentials from Meta Business Suite
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Account Label (Optional)</Label>
              <Input
                placeholder="e.g., Sales Team, Support"
                value={newAccountData.account_label}
                onChange={(e) => setNewAccountData({ ...newAccountData, account_label: e.target.value })}
              />
            </div>
            <div>
              <Label>Display Phone Number</Label>
              <Input
                placeholder="+31622888444"
                value={newAccountData.display_phone_number}
                onChange={(e) => setNewAccountData({ ...newAccountData, display_phone_number: e.target.value })}
              />
            </div>
            <div>
              <Label>Phone Number ID</Label>
              <Input
                placeholder="From Meta Business Suite"
                value={newAccountData.phone_number_id}
                onChange={(e) => setNewAccountData({ ...newAccountData, phone_number_id: e.target.value })}
                className="font-mono"
              />
            </div>
            <div>
              <Label>Business Account ID</Label>
              <Input
                placeholder="Your WABA ID"
                value={newAccountData.business_account_id}
                onChange={(e) => setNewAccountData({ ...newAccountData, business_account_id: e.target.value })}
                className="font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddAccount} 
              disabled={createAccount.isPending || !newAccountData.phone_number_id || !newAccountData.business_account_id}
            >
              {createAccount.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Account'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete WhatsApp Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the account "{selectedAccount?.display_phone_number}" and all associated data including conversations, messages, and templates. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteAccount.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Account'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
