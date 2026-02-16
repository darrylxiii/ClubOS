import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Crown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePartnerProvisioning } from '@/hooks/usePartnerProvisioning';
import { useProvisionForm, type PrefillData, type ProvisionFormData } from './partner-provisioning/useProvisionForm';
import { ContactStep } from './partner-provisioning/steps/ContactStep';
import { CompanyStep } from './partner-provisioning/steps/CompanyStep';
import { AccessStep } from './partner-provisioning/steps/AccessStep';
import { ReviewStep } from './partner-provisioning/steps/ReviewStep';
import { ProvisionSuccessView } from './partner-provisioning/ProvisionSuccessView';
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog';

interface PartnerProvisioningModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  prefillData?: PrefillData;
}

const STEP_LABELS = ['Contact', 'Company', 'Access', 'Review'];

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
  } = useProvisionForm(prefillData);

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

  const handleSubmit = useCallback(async () => {
    const valid = await form.trigger();
    if (!valid) return;

    const v = form.getValues();
    const result = await provisionPartner({
      email: v.email,
      fullName: v.fullName,
      phoneNumber: v.phoneNumber || undefined,
      markEmailVerified: v.markEmailVerified,
      markPhoneVerified: v.markPhoneVerified,
      companyId: v.companyMode === 'existing' ? v.companyId : undefined,
      companyName: v.companyMode === 'new' ? v.companyName : undefined,
      companyDomain: v.companyDomain || undefined,
      companyRole: v.companyRole,
      industry: v.industry || undefined,
      companySize: v.companySize || undefined,
      provisionMethod: v.provisionMethod,
      temporaryPassword: v.temporaryPassword || undefined,
      enableDomainAutoProvisioning: v.enableDomainAutoProvisioning,
      domainDefaultRole: v.domainDefaultRole,
      requireDomainApproval: v.requireDomainApproval,
      welcomeMessage: v.welcomeMessage || undefined,
      assignedStrategistId: v.assignedStrategistId || undefined,
    });

    if (result.success) {
      setShowSuccess(true);
    }
  }, [form, provisionPartner]);

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

          {/* Step Progress */}
          <nav aria-label="Provisioning steps" className="flex items-center justify-between px-2 mb-4">
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
                  onNext={() => setStep(2)}
                />
              )}
              {step === 2 && (
                <CompanyStep
                  form={form}
                  companies={companies}
                  onBack={() => setStep(1)}
                  onNext={() => setStep(3)}
                />
              )}
              {step === 3 && (
                <AccessStep
                  form={form}
                  strategists={strategists}
                  onBack={() => setStep(2)}
                  onNext={() => setStep(4)}
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
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={showCloseConfirm}
        onOpenChange={setShowCloseConfirm}
        title="Unsaved Changes"
        description="You have unsaved changes. Are you sure you want to close this form?"
        confirmText="Discard"
        variant="destructive"
        onConfirm={doClose}
      />
    </>
  );
}
