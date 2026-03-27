import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Crown, Zap, Settings2 } from 'lucide-react';
import { AnimatePresence, motion } from '@/lib/motion';
import { toast } from 'sonner';
import { FieldErrors } from 'react-hook-form';
import { usePartnerProvisioning } from '@/hooks/usePartnerProvisioning';
import { useProvisionForm, type PrefillData, type ProvisionFormData } from './partner-provisioning/useProvisionForm';
import { ContactStep } from './partner-provisioning/steps/ContactStep';
import { CompanyStep } from './partner-provisioning/steps/CompanyStep';
import { AccessStep } from './partner-provisioning/steps/AccessStep';
import { ReviewStep } from './partner-provisioning/steps/ReviewStep';
import { ProvisionSuccessView } from './partner-provisioning/ProvisionSuccessView';
import { QuickProvisionView } from './partner-provisioning/QuickProvisionView';
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog';
import { useTranslation } from 'react-i18next';

interface PartnerProvisioningModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  prefillData?: PrefillData;
}

const STEP_LABELS = ['Contact', 'Company', 'Access', 'Review'];

const FIELD_TO_STEP: Record<string, number> = {
  fullName: 1, email: 1, phoneNumber: 1, linkedinUrl: 1, markEmailVerified: 1, markPhoneVerified: 1,
  companyMode: 2, companyId: 2, companyName: 2, companyDomain: 2, companyRole: 2, industry: 2,
  companySize: 2, websiteUrl: 2, feeType: 2, placementFeePercentage: 2, placementFeeFixed: 2,
  defaultPaymentTermsDays: 2, enableDomainAutoProvisioning: 2, estimatedRolesPerYear: 2,
  provisionMethod: 3, temporaryPassword: 3, welcomeMessage: 3, assignedStrategistId: 3,
  agreedNda: 4,
};

function extractFirstError(errors: FieldErrors): string {
  const { t } = useTranslation('admin');
  for (const key of Object.keys(errors)) {
    const err = errors[key];
    if (!err) continue;
    if (typeof err.message === 'string') return err.message;
    if (err.root && typeof err.root.message === 'string') return err.root.message;
  }
  return 'Please fix validation errors before submitting';
}

function getFirstErrorStep(errors: FieldErrors): number | null {
  for (const key of Object.keys(errors)) {
    if (FIELD_TO_STEP[key]) return FIELD_TO_STEP[key];
  }
  return null;
}

export function PartnerProvisioningModal({
  open,
  onClose,
  onSuccess,
  prefillData,
}: PartnerProvisioningModalProps) {
  const { provisionPartner, isProvisioning, lastResult } = usePartnerProvisioning();
  const {
    form,
    companies,
    strategists,
    duplicateWarning,
    isCheckingDuplicate,
    checkDuplicate,
    resetForm,
    isDirty,
    domainMatchedCompany,
  } = useProvisionForm(prefillData);

  const [mode, setMode] = useState<'quick' | 'advanced'>('quick');
  const [step, setStep] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const handleClose = useCallback(() => {
    if (isDirty && !showSuccess) {
      setShowCloseConfirm(true);
      return;
    }
    doClose();
  }, [isDirty, showSuccess]);

  const doClose = useCallback(() => {
    setStep(1);
    setShowSuccess(false);
    setShowCloseConfirm(false);
    resetForm();
    onClose();
    if (showSuccess) onSuccess?.();
  }, [resetForm, onClose, onSuccess, showSuccess]);

  const doProvision = useCallback(async (data: ProvisionFormData) => {
    const result = await provisionPartner({
      email: data.email,
      fullName: data.fullName,
      phoneNumber: data.phoneNumber || undefined,
      markEmailVerified: true,
      markPhoneVerified: !!data.phoneNumber,
      companyId: data.companyMode === 'existing' ? data.companyId : undefined,
      companyName: data.companyMode === 'new' ? data.companyName : undefined,
      companyDomain: data.companyDomain || undefined,
      companyRole: data.companyRole,
      industry: data.industry || undefined,
      companySize: data.companySize || undefined,
      provisionMethod: mode === 'quick' ? 'magic_link' : data.provisionMethod,
      temporaryPassword: data.temporaryPassword || undefined,
      enableDomainAutoProvisioning: mode === 'quick' ? false : data.enableDomainAutoProvisioning,
      domainDefaultRole: data.domainDefaultRole,
      requireDomainApproval: data.requireDomainApproval,
      welcomeMessage: data.welcomeMessage || undefined,
      assignedStrategistId: data.assignedStrategistId || undefined,
    });

    if (result.success) {
      setShowSuccess(true);
    }
  }, [provisionPartner, mode]);

  const onInvalid = useCallback((errors: FieldErrors<ProvisionFormData>) => {
    const msg = extractFirstError(errors);
    toast.error(msg);
    const errorStep = getFirstErrorStep(errors);
    if (errorStep && errorStep < 4) {
      setStep(errorStep);
    }
  }, []);

  const handleSubmit = useCallback(() => {
    if (mode === 'quick') {
      // Quick mode: trigger only essentials then submit
      form.trigger(['email', 'fullName']).then((valid) => {
        if (!valid) {
          const msg = extractFirstError(form.formState.errors);
          toast.error(msg);
          return;
        }
        doProvision(form.getValues());
      });
    } else {
      // Advanced mode: use handleSubmit which guarantees onInvalid fires
      form.handleSubmit(
        (data) => doProvision(data),
        onInvalid
      )();
    }
  }, [form, mode, doProvision, onInvalid]);

  const handleAddAnother = useCallback(() => {
    setShowSuccess(false);
    setStep(1);
    resetForm();
  }, [resetForm]);

  if (showSuccess && lastResult) {
    const v = form.getValues();
    return (
      <Dialog open={open} onOpenChange={doClose}>
        <DialogContent className="sm:max-w-lg">
          <ProvisionSuccessView
            result={lastResult}
            partnerName={v.fullName}
            phoneNumber={v.phoneNumber}
            onDone={doClose}
            onAddAnother={handleAddAnother}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className={mode === 'quick' ? 'sm:max-w-lg max-h-[90vh] overflow-y-auto' : 'sm:max-w-2xl max-h-[90vh] overflow-y-auto'}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              Provision Partner Account
            </DialogTitle>
            <DialogDescription>
              Create a white-glove partner experience with pre-verified access
            </DialogDescription>
          </DialogHeader>

          {/* Mode Toggle */}
          <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg w-fit">
            <button
              type="button"
              onClick={() => { setMode('quick'); setStep(1); }}
              className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-all ${
                mode === 'quick'
                  ? 'bg-background text-foreground shadow-sm font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              Quick
            </button>
            <button
              type="button"
              onClick={() => setMode('advanced')}
              className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-all ${
                mode === 'advanced'
                  ? 'bg-background text-foreground shadow-sm font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Settings2 className="w-3.5 h-3.5" />
              Advanced
            </button>
          </div>

          {mode === 'quick' ? (
            <QuickProvisionView
              form={form}
              companies={companies}
              strategists={strategists}
              duplicateWarning={duplicateWarning}
              isCheckingDuplicate={isCheckingDuplicate}
              onCheckDuplicate={checkDuplicate}
              isProvisioning={isProvisioning}
              onSubmit={handleSubmit}
              domainMatchedCompany={domainMatchedCompany}
            />
          ) : (
            <>
              {/* Step Progress */}
              <nav aria-label={t('partnerProvisioningModal.provisioningSteps')} className="flex items-center justify-between px-2 mb-4">
                {STEP_LABELS.map((label, i) => {
                  const s = i + 1;
                  const isActive = step === s;
                  const isComplete = step > s;
                  return (
                    <div key={label} className="flex items-center">
                      <button
                        type="button"
                        onClick={() => s < step && setStep(s)}
                        disabled={s > step}
                        aria-current={isActive ? 'step' : undefined}
                        className={`
                          flex items-center gap-2 text-sm font-medium transition-colors
                          ${isActive ? 'text-primary' : isComplete ? 'text-foreground cursor-pointer' : 'text-muted-foreground'}
                        `}
                      >
                        <div className={`
                          w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold
                          ${isActive ? 'bg-primary text-primary-foreground' : isComplete ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}
                        `}>
                          {s}
                        </div>
                        <span className="hidden sm:inline">{label}</span>
                      </button>
                      {s < 4 && (
                        <div className={`w-8 sm:w-14 h-0.5 mx-1.5 ${step > s ? 'bg-primary' : 'bg-muted'}`} />
                      )}
                    </div>
                  );
                })}
              </nav>

              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {step === 1 && (
                    <ContactStep
                      form={form}
                      duplicateWarning={duplicateWarning}
                      isCheckingDuplicate={isCheckingDuplicate}
                      onCheckDuplicate={checkDuplicate}
                      onNext={() => {
                        form.trigger(['fullName', 'email']).then((valid) => {
                          if (valid) setStep(2);
                        });
                      }}
                    />
                  )}
                  {step === 2 && (
                    <CompanyStep
                      form={form}
                      companies={companies}
                      onBack={() => setStep(1)}
                      onNext={() => {
                        const companyMode = form.getValues('companyMode');
                        const fields: Array<keyof ProvisionFormData> = companyMode === 'existing'
                          ? ['companyId']
                          : ['companyName'];
                        form.trigger(fields).then((valid) => {
                          if (valid) setStep(3);
                          else toast.error(extractFirstError(form.formState.errors));
                        });
                      }}
                    />
                  )}
                  {step === 3 && (
                    <AccessStep
                      form={form}
                      strategists={strategists}
                      onBack={() => setStep(2)}
                      onNext={() => {
                        const method = form.getValues('provisionMethod');
                        if (method === 'password') {
                          const pw = form.getValues('temporaryPassword') || '';
                          if (pw.length < 12) {
                            form.setError('temporaryPassword', {
                              message: 'Password must be at least 12 characters',
                            });
                            toast.error(t('partnerProvisioningModal.passwordMustBeAtLeast12'));
                            return;
                          }
                        }
                        setStep(4);
                      }}
                    />
                  )}
                  {step === 4 && (
                    <ReviewStep
                      form={form}
                      companies={companies}
                      isProvisioning={isProvisioning}
                      onBack={() => setStep(3)}
                      onSubmit={handleSubmit}
                      onGoToStep={setStep}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={showCloseConfirm}
        onOpenChange={setShowCloseConfirm}
        title={t('partnerProvisioningModal.unsavedChanges')}
        description={"You have unsaved changes. Are you sure you want to close this form?"}
        confirmText="Discard"
        variant="destructive"
        onConfirm={doClose}
      />
    </>
  );
}
