import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserPlus, Mail, Phone, Briefcase, Star, StarOff, 
  Trash2, Edit2, Save, X, Globe, Plus, AlertCircle 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  useCompanyContacts, 
  useCompanyDomains,
  useCreateCompanyContact,
  useUpdateCompanyContact,
  useDeleteCompanyContact,
  useCreateCompanyDomain,
  useDeleteCompanyDomain,
  CompanyContact,
  CompanyDomain,
} from '@/hooks/useCompanyContacts';

interface CompanyContactManagerProps {
  companyId: string;
  companyName: string;
}

export function CompanyContactManager({ companyId, companyName }: CompanyContactManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('contacts');
  const [editingContact, setEditingContact] = useState<string | null>(null);
  const [newContact, setNewContact] = useState({
    email: '',
    full_name: '',
    role: '',
    phone: '',
    is_primary: false,
  });
  const [newDomain, setNewDomain] = useState('');

  const { data: contacts = [], isLoading: loadingContacts } = useCompanyContacts(companyId);
  const { data: domains = [], isLoading: loadingDomains } = useCompanyDomains(companyId);

  const createContact = useCreateCompanyContact();
  const updateContact = useUpdateCompanyContact();
  const deleteContact = useDeleteCompanyContact();
  const createDomain = useCreateCompanyDomain();
  const deleteDomain = useDeleteCompanyDomain();

  const handleAddContact = () => {
    if (!newContact.email) return;
    
    createContact.mutate({
      company_id: companyId,
      email: newContact.email.toLowerCase(),
      full_name: newContact.full_name || null,
      role: newContact.role || null,
      phone: newContact.phone || null,
      is_primary: newContact.is_primary,
      source: 'manual',
      profile_id: null,
      created_by: null,
    }, {
      onSuccess: () => {
        setNewContact({ email: '', full_name: '', role: '', phone: '', is_primary: false });
      },
    });
  };

  const handleAddDomain = () => {
    if (!newDomain) return;
    
    const cleanDomain = newDomain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    
    createDomain.mutate({
      company_id: companyId,
      domain: cleanDomain,
      is_primary: domains.length === 0,
      is_blocked: false,
    }, {
      onSuccess: () => {
        setNewDomain('');
      },
    });
  };

  const togglePrimary = (contact: CompanyContact) => {
    updateContact.mutate({
      id: contact.id,
      is_primary: !contact.is_primary,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <UserPlus className="h-4 w-4" />
          Manage Contacts
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage {companyName} Contacts & Domains</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="contacts">
              <Mail className="h-4 w-4 mr-2" />
              Contacts ({contacts.length})
            </TabsTrigger>
            <TabsTrigger value="domains">
              <Globe className="h-4 w-4 mr-2" />
              Domains ({domains.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="contacts" className="space-y-4">
            {/* Add New Contact Form */}
            <Card className="bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Add New Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Email *</Label>
                    <Input
                      type="email"
                      placeholder="contact@company.com"
                      value={newContact.email}
                      onChange={(e) => setNewContact(prev => ({ ...prev, email: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Full Name</Label>
                    <Input
                      placeholder="John Doe"
                      value={newContact.full_name}
                      onChange={(e) => setNewContact(prev => ({ ...prev, full_name: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Role</Label>
                    <Input
                      placeholder="HR Manager"
                      value={newContact.role}
                      onChange={(e) => setNewContact(prev => ({ ...prev, role: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Phone</Label>
                    <Input
                      placeholder="+31 6 12345678"
                      value={newContact.phone}
                      onChange={(e) => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <Button 
                  size="sm" 
                  onClick={handleAddContact}
                  disabled={!newContact.email || createContact.isPending}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Contact
                </Button>
              </CardContent>
            </Card>

            {/* Contacts List */}
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {contacts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No contacts yet</p>
                    <p className="text-xs">Add contacts to track email sentiment</p>
                  </div>
                ) : (
                  <AnimatePresence>
                    {contacts.map((contact) => (
                      <motion.div
                        key={contact.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {contact.full_name?.charAt(0) || contact.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">
                                {contact.full_name || contact.email}
                              </span>
                              {contact.is_primary && (
                                <Badge variant="secondary" className="text-xs">Primary</Badge>
                              )}
                              <Badge variant="outline" className="text-xs capitalize">
                                {contact.source}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {contact.email}
                              </span>
                              {contact.role && (
                                <span className="flex items-center gap-1">
                                  <Briefcase className="h-3 w-3" />
                                  {contact.role}
                                </span>
                              )}
                              {contact.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {contact.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => togglePrimary(contact)}
                          >
                            {contact.is_primary ? (
                              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            ) : (
                              <StarOff className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => deleteContact.mutate(contact.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="domains" className="space-y-4">
            {/* Add New Domain Form */}
            <Card className="bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Add Email Domain</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="company.com"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleAddDomain}
                    disabled={!newDomain || createDomain.isPending}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Emails from this domain will be automatically linked to {companyName}
                </p>
              </CardContent>
            </Card>

            {/* Domains List */}
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {domains.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No domains configured</p>
                    <p className="text-xs">Add domains to auto-match emails</p>
                  </div>
                ) : (
                  <AnimatePresence>
                    {domains.map((domain) => (
                      <motion.div
                        key={domain.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-3">
                          <Globe className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">@{domain.domain}</span>
                              {domain.is_primary && (
                                <Badge variant="secondary" className="text-xs">Primary</Badge>
                              )}
                              {domain.is_blocked && (
                                <Badge variant="destructive" className="text-xs">Blocked</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => deleteDomain.mutate(domain.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
