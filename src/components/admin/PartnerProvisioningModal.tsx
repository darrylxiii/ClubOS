import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  UserPlus, Building2, Mail, Phone, Shield, Key, 
  Globe, CheckCircle, Copy, ExternalLink, Sparkles,
  Send, Calendar, Crown, Users, Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { usePartnerProvisioning, ProvisionPartnerData } from '@/hooks/usePartnerProvisioning';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

interface PartnerProvisioningModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  prefillData?: {
    email?: string;
    fullName?: string;
    companyName?: string;
    phoneNumber?: string;
  };
}

interface Company {
  id: string;
  name: string;
  slug: string;
}

const INDUSTRIES = [
  'Technology', 'Finance', 'Healthcare', 'E-commerce', 'SaaS', 
  'Consulting', 'Manufacturing', 'Media', 'Education', 'Other'
];

const COMPANY_SIZES = [
  '1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'
];

export function PartnerProvisioningModal({ 
  open, 
  onClose, 
  onSuccess,
  prefillData 
}: PartnerProvisioningModalProps) {
  const { provisionPartner, isProvisioning, lastResult, copyMagicLink } = usePartnerProvisioning();
  const [step, setStep] = useState(1);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);

  // Form state
  const [formData, setFormData] = useState<ProvisionPartnerData>({
    email: prefillData?.email || '',
    fullName: prefillData?.fullName || '',
    phoneNumber: prefillData?.phoneNumber || '',
    markEmailVerified: true,
    markPhoneVerified: false,
    companyId: '',
    companyName: prefillData?.companyName || '',
    companyDomain: '',
    companyRole: 'owner',
    industry: '',
    companySize: '',
    provisionMethod: 'magic_link',
    temporaryPassword: '',
    enableDomainAutoProvisioning: false,
    domainDefaultRole: 'member',
    requireDomainApproval: true,
    welcomeMessage: ''
  });

  useEffect(() => {
    if (open) {
      loadCompanies();
      // Extract domain from email
      if (formData.email && !formData.companyDomain) {
        const domain = formData.email.split('@')[1];
        if (domain && !['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com'].includes(domain)) {
          setFormData(prev => ({ ...prev, companyDomain: domain }));
        }
      }
    }
  }, [open, formData.email]);

  useEffect(() => {
    if (prefillData) {
      setFormData(prev => ({
        ...prev,
        email: prefillData.email || prev.email,
        fullName: prefillData.fullName || prev.fullName,
        companyName: prefillData.companyName || prev.companyName,
        phoneNumber: prefillData.phoneNumber || prev.phoneNumber
      }));
    }
  }, [prefillData]);

  const loadCompanies = async () => {
    const { data } = await supabase
      .from('companies')
      .select('id, name, slug')
      .eq('is_active', true)
      .order('name');
    
    setCompanies(data || []);
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.email || !formData.fullName) {
      toast.error('Email and full name are required');
      return;
    }

    if (!formData.companyId && !formData.companyName) {
      toast.error('Please select or create a company');
      return;
    }

    if (formData.provisionMethod === 'password' && (!formData.temporaryPassword || formData.temporaryPassword.length < 12)) {
      toast.error('Password must be at least 12 characters');
      return;
    }

    const result = await provisionPartner(formData);
    
    if (result.success) {
      setShowSuccess(true);
    }
  };

  const handleClose = () => {
    setStep(1);
    setShowSuccess(false);
    setFormData({
      email: '',
      fullName: '',
      phoneNumber: '',
      markEmailVerified: true,
      markPhoneVerified: false,
      companyId: '',
      companyName: '',
      companyDomain: '',
      companyRole: 'owner',
      industry: '',
      companySize: '',
      provisionMethod: 'magic_link',
      temporaryPassword: '',
      enableDomainAutoProvisioning: false,
      domainDefaultRole: 'member',
      requireDomainApproval: true,
      welcomeMessage: ''
    });
    onClose();
    if (showSuccess) {
      onSuccess?.();
    }
  };

  const updateField = <K extends keyof ProvisionPartnerData>(
    field: K, 
    value: ProvisionPartnerData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (showSuccess && lastResult) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-6"
          >
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-emerald-500" />
            </div>
            
            <h2 className="text-2xl font-bold mb-2">Partner Provisioned!</h2>
            <p className="text-muted-foreground mb-6">
              {formData.fullName} has been added as a partner
            </p>

            <div className="space-y-4 text-left bg-muted/30 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Invite Code</span>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono bg-background px-2 py-1 rounded">
                    {lastResult.invite_code}
                  </code>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8"
                    onClick={() => {
                      navigator.clipboard.writeText(lastResult.invite_code || '');
                      toast.success('Copied!');
                    }}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {lastResult.magic_link && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Magic Link</span>
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => copyMagicLink(lastResult.magic_link!)}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Link
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Welcome Email</span>
                <Badge variant={lastResult.welcome_email_sent ? 'default' : 'secondary'}>
                  {lastResult.welcome_email_sent ? 'Sent' : 'Not Sent'}
                </Badge>
              </div>

              {lastResult.company_slug && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Company Page</span>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => window.open(`/companies/${lastResult.company_slug}`, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View
                  </Button>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                Done
              </Button>
              <Button 
                className="flex-1" 
                onClick={() => {
                  setShowSuccess(false);
                  setStep(1);
                  setFormData({
                    email: '',
                    fullName: '',
                    phoneNumber: '',
                    markEmailVerified: true,
                    markPhoneVerified: false,
                    companyId: '',
                    companyName: '',
                    companyDomain: '',
                    companyRole: 'owner',
                    industry: '',
                    companySize: '',
                    provisionMethod: 'magic_link',
                    temporaryPassword: '',
                    enableDomainAutoProvisioning: false,
                    domainDefaultRole: 'member',
                    requireDomainApproval: true,
                    welcomeMessage: ''
                  });
                }}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add Another
              </Button>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-primary" />
            Provision Partner Account
          </DialogTitle>
          <DialogDescription>
            Create a white-glove partner experience with pre-verified access
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex items-center justify-between px-4 mb-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
              `}>
                {s}
              </div>
              {s < 3 && (
                <div className={`w-20 h-0.5 mx-2 ${step > s ? 'bg-primary' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Contact Information
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => updateField('fullName', e.target.value)}
                      placeholder="John Smith"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => {
                        updateField('email', e.target.value);
                        // Auto-extract domain
                        const domain = e.target.value.split('@')[1];
                        if (domain && !['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com'].includes(domain)) {
                          updateField('companyDomain', domain);
                        }
                      }}
                      placeholder="john@company.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <PhoneInput
                    international
                    defaultCountry="NL"
                    value={formData.phoneNumber}
                    onChange={(value) => updateField('phoneNumber', value || '')}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>

                {/* Pre-verification Toggles */}
                <Card className="bg-muted/30">
                  <CardContent className="pt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-emerald-500" />
                          Mark Email as Verified
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Skip email confirmation step
                        </p>
                      </div>
                      <Switch
                        checked={formData.markEmailVerified}
                        onCheckedChange={(checked) => updateField('markEmailVerified', checked)}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-emerald-500" />
                          Mark Phone as Verified
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Skip phone verification step
                        </p>
                      </div>
                      <Switch
                        checked={formData.markPhoneVerified}
                        onCheckedChange={(checked) => updateField('markPhoneVerified', checked)}
                        disabled={!formData.phoneNumber}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setStep(2)} disabled={!formData.email || !formData.fullName}>
                  Continue
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Company Configuration */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Company Configuration
                </h3>

                <Tabs defaultValue={formData.companyId ? 'existing' : 'new'}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="existing">Existing Company</TabsTrigger>
                    <TabsTrigger value="new">Create New</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="existing" className="space-y-4 mt-4">
                    <Select
                      value={formData.companyId}
                      onValueChange={(value) => {
                        updateField('companyId', value);
                        updateField('companyName', '');
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a company" />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TabsContent>

                  <TabsContent value="new" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Company Name *</Label>
                      <Input
                        value={formData.companyName}
                        onChange={(e) => {
                          updateField('companyName', e.target.value);
                          updateField('companyId', '');
                        }}
                        placeholder="Acme Corporation"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Industry</Label>
                        <Select
                          value={formData.industry}
                          onValueChange={(value) => updateField('industry', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select industry" />
                          </SelectTrigger>
                          <SelectContent>
                            {INDUSTRIES.map((ind) => (
                              <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Company Size</Label>
                        <Select
                          value={formData.companySize}
                          onValueChange={(value) => updateField('companySize', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select size" />
                          </SelectTrigger>
                          <SelectContent>
                            {COMPANY_SIZES.map((size) => (
                              <SelectItem key={size} value={size}>{size} employees</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="space-y-2">
                  <Label>Company Role</Label>
                  <Select
                    value={formData.companyRole}
                    onValueChange={(value: 'owner' | 'admin' | 'recruiter' | 'member') => 
                      updateField('companyRole', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner">
                        <div className="flex items-center gap-2">
                          <Crown className="w-4 h-4 text-yellow-500" />
                          Owner
                        </div>
                      </SelectItem>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-blue-500" />
                          Admin
                        </div>
                      </SelectItem>
                      <SelectItem value="recruiter">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-green-500" />
                          Recruiter
                        </div>
                      </SelectItem>
                      <SelectItem value="member">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          Member
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Domain Auto-Provisioning */}
                {formData.companyDomain && (
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="pt-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-primary" />
                            Enable @{formData.companyDomain} Auto-Provisioning
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Anyone with this email domain can self-register to this company
                          </p>
                        </div>
                        <Switch
                          checked={formData.enableDomainAutoProvisioning}
                          onCheckedChange={(checked) => updateField('enableDomainAutoProvisioning', checked)}
                        />
                      </div>

                      {formData.enableDomainAutoProvisioning && (
                        <>
                          <Separator />
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Default Role</Label>
                              <Select
                                value={formData.domainDefaultRole}
                                onValueChange={(value) => updateField('domainDefaultRole', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="member">Member</SelectItem>
                                  <SelectItem value="recruiter">Recruiter</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-center gap-2 pt-6">
                              <Switch
                                checked={formData.requireDomainApproval}
                                onCheckedChange={(checked) => updateField('requireDomainApproval', checked)}
                              />
                              <Label>Require Approval</Label>
                            </div>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button 
                  onClick={() => setStep(3)} 
                  disabled={!formData.companyId && !formData.companyName}
                >
                  Continue
                </Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Authentication & Welcome */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  Access Method
                </h3>

                <RadioGroup
                  value={formData.provisionMethod}
                  onValueChange={(value: 'magic_link' | 'password' | 'oauth_only') => 
                    updateField('provisionMethod', value)
                  }
                  className="space-y-3"
                >
                  <Card className={`cursor-pointer transition-all ${formData.provisionMethod === 'magic_link' ? 'border-primary bg-primary/5' : ''}`}>
                    <CardContent className="flex items-center gap-4 p-4">
                      <RadioGroupItem value="magic_link" id="magic_link" />
                      <div className="flex-1">
                        <Label htmlFor="magic_link" className="flex items-center gap-2 cursor-pointer">
                          <Sparkles className="w-4 h-4 text-primary" />
                          Magic Link (Recommended)
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          One-click login via email - expires in 72 hours
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={`cursor-pointer transition-all ${formData.provisionMethod === 'password' ? 'border-primary bg-primary/5' : ''}`}>
                    <CardContent className="flex items-center gap-4 p-4">
                      <RadioGroupItem value="password" id="password" />
                      <div className="flex-1">
                        <Label htmlFor="password" className="flex items-center gap-2 cursor-pointer">
                          <Lock className="w-4 h-4" />
                          Temporary Password
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Set a password for first login
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={`cursor-pointer transition-all ${formData.provisionMethod === 'oauth_only' ? 'border-primary bg-primary/5' : ''}`}>
                    <CardContent className="flex items-center gap-4 p-4">
                      <RadioGroupItem value="oauth_only" id="oauth_only" />
                      <div className="flex-1">
                        <Label htmlFor="oauth_only" className="flex items-center gap-2 cursor-pointer">
                          <Globe className="w-4 h-4" />
                          Google SSO Only
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Partner can only sign in with Google OAuth
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </RadioGroup>

                {formData.provisionMethod === 'password' && (
                  <div className="space-y-2">
                    <Label>Temporary Password</Label>
                    <Input
                      type="password"
                      value={formData.temporaryPassword}
                      onChange={(e) => updateField('temporaryPassword', e.target.value)}
                      placeholder="Min 12 characters"
                    />
                  </div>
                )}
              </div>

              {/* Welcome Message */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  Welcome Experience
                </h3>

                <div className="space-y-2">
                  <Label>Personal Welcome Message</Label>
                  <Textarea
                    value={formData.welcomeMessage}
                    onChange={(e) => updateField('welcomeMessage', e.target.value)}
                    placeholder="We're excited to have you join The Quantum Club..."
                    rows={3}
                  />
                </div>
              </div>

              {/* Summary */}
              <Card className="bg-muted/30">
                <CardContent className="pt-4 space-y-2">
                  <h4 className="font-semibold mb-3">Provision Summary</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">Partner:</span>
                    <span>{formData.fullName}</span>
                    <span className="text-muted-foreground">Email:</span>
                    <span>{formData.email}</span>
                    <span className="text-muted-foreground">Company:</span>
                    <span>{formData.companyName || companies.find(c => c.id === formData.companyId)?.name}</span>
                    <span className="text-muted-foreground">Role:</span>
                    <span className="capitalize">{formData.companyRole}</span>
                    <span className="text-muted-foreground">Access:</span>
                    <span className="capitalize">{formData.provisionMethod.replace('_', ' ')}</span>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button onClick={handleSubmit} disabled={isProvisioning}>
                  {isProvisioning ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"
                      />
                      Provisioning...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Provision Partner
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
