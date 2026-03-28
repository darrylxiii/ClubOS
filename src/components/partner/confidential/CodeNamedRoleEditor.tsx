import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Lock, Loader2 } from 'lucide-react';
import { motion } from '@/lib/motion';
import type { DisclosureLevel, ConfidentialMetadata } from '@/hooks/useConfidentialMode';

interface CodeNamedRoleEditorProps {
  onSubmit: (data: {
    codeName: string;
    actualTitle: string;
    disclosureLevel: DisclosureLevel;
    tierDescriptions: ConfidentialMetadata['tier_descriptions'];
  }) => void;
  isSubmitting?: boolean;
  initialValues?: {
    codeName?: string;
    actualTitle?: string;
    disclosureLevel?: DisclosureLevel;
    tierDescriptions?: ConfidentialMetadata['tier_descriptions'];
  };
  onCancel?: () => void;
}

export function CodeNamedRoleEditor({
  onSubmit,
  isSubmitting = false,
  initialValues,
  onCancel,
}: CodeNamedRoleEditorProps) {
  const { t } = useTranslation('partner');

  const [codeName, setCodeName] = useState(initialValues?.codeName || '');
  const [actualTitle, setActualTitle] = useState(initialValues?.actualTitle || '');
  const [disclosureLevel, setDisclosureLevel] = useState<DisclosureLevel>(
    initialValues?.disclosureLevel || 'code_name_only'
  );
  const [tierDesc1, setTierDesc1] = useState(
    initialValues?.tierDescriptions?.code_name_only || ''
  );
  const [tierDesc2, setTierDesc2] = useState(
    initialValues?.tierDescriptions?.nda_required || ''
  );
  const [tierDesc3, setTierDesc3] = useState(
    initialValues?.tierDescriptions?.full_access || ''
  );

  const isValid = codeName.trim().length > 0 && actualTitle.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isSubmitting) return;

    onSubmit({
      codeName: codeName.trim(),
      actualTitle: actualTitle.trim(),
      disclosureLevel,
      tierDescriptions: {
        code_name_only: tierDesc1.trim() || undefined,
        nda_required: tierDesc2.trim() || undefined,
        full_access: tierDesc3.trim() || undefined,
      },
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Card className="glass-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4 text-amber-500" />
            {t('confidential.editor.title', 'Confidential Search Details')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Code Name */}
            <div className="space-y-2">
              <Label htmlFor="code-name">
                {t('confidential.editor.codeName', 'Code Name')}
              </Label>
              <Input
                id="code-name"
                placeholder={t('confidential.editor.codeNamePlaceholder', 'e.g. Project Phoenix')}
                value={codeName}
                onChange={(e) => setCodeName(e.target.value)}
                disabled={isSubmitting}
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground">
                {t('confidential.editor.codeNameHint', 'This is the only name candidates will see at the most restricted tier.')}
              </p>
            </div>

            {/* Actual Role Title */}
            <div className="space-y-2">
              <Label htmlFor="actual-title">
                {t('confidential.editor.actualTitle', 'Actual Role Title')}
              </Label>
              <Input
                id="actual-title"
                placeholder={t('confidential.editor.actualTitlePlaceholder', 'e.g. Chief Technology Officer')}
                value={actualTitle}
                onChange={(e) => setActualTitle(e.target.value)}
                disabled={isSubmitting}
              />
              <p className="text-[11px] text-muted-foreground">
                {t('confidential.editor.actualTitleHint', 'Hidden from candidates until disclosure is granted.')}
              </p>
            </div>

            {/* Disclosure Level */}
            <div className="space-y-2">
              <Label htmlFor="disclosure-level">
                {t('confidential.editor.disclosureLevel', 'Initial Disclosure Level')}
              </Label>
              <Select
                value={disclosureLevel}
                onValueChange={(v) => setDisclosureLevel(v as DisclosureLevel)}
                disabled={isSubmitting}
              >
                <SelectTrigger id="disclosure-level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="code_name_only">
                    {t('confidential.tier.codeNameOnly', 'Tier 1 — Code Name Only')}
                  </SelectItem>
                  <SelectItem value="nda_required">
                    {t('confidential.tier.ndaRequired', 'Tier 2 — NDA Required')}
                  </SelectItem>
                  <SelectItem value="full_access">
                    {t('confidential.tier.fullAccess', 'Tier 3 — Full Access')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tier Descriptions */}
            <div className="space-y-4 pt-2 border-t border-border/30">
              <p className="text-xs font-medium text-muted-foreground">
                {t('confidential.editor.tierDescriptions', 'What candidates see at each tier (optional)')}
              </p>

              <div className="space-y-2">
                <Label htmlFor="tier-desc-1" className="text-xs">
                  {t('confidential.tier.codeNameOnly', 'Tier 1 — Code Name Only')}
                </Label>
                <Textarea
                  id="tier-desc-1"
                  placeholder={t('confidential.editor.tier1Placeholder', 'Senior leadership role at a leading technology company...')}
                  value={tierDesc1}
                  onChange={(e) => setTierDesc1(e.target.value)}
                  className="min-h-[60px] text-sm"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tier-desc-2" className="text-xs">
                  {t('confidential.tier.ndaRequired', 'Tier 2 — NDA Required')}
                </Label>
                <Textarea
                  id="tier-desc-2"
                  placeholder={t('confidential.editor.tier2Placeholder', 'C-suite position reporting to the CEO at a Series D company...')}
                  value={tierDesc2}
                  onChange={(e) => setTierDesc2(e.target.value)}
                  className="min-h-[60px] text-sm"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tier-desc-3" className="text-xs">
                  {t('confidential.tier.fullAccess', 'Tier 3 — Full Access')}
                </Label>
                <Textarea
                  id="tier-desc-3"
                  placeholder={t('confidential.editor.tier3Placeholder', 'Full job description with company details, compensation, and team info...')}
                  value={tierDesc3}
                  onChange={(e) => setTierDesc3(e.target.value)}
                  className="min-h-[60px] text-sm"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              {onCancel && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onCancel}
                  disabled={isSubmitting}
                >
                  {t('confidential.editor.cancel', 'Cancel')}
                </Button>
              )}
              <Button type="submit" disabled={!isValid || isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {initialValues?.codeName
                  ? t('confidential.editor.update', 'Update Search')
                  : t('confidential.editor.create', 'Create Confidential Search')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
