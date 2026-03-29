import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type LegalEntityFilter = 'all' | 'tqc_nl' | 'tqc_dubai';

interface EntitySelectorProps {
  value: LegalEntityFilter;
  onChange: (value: LegalEntityFilter) => void;
}

export function EntitySelector({ value, onChange }: EntitySelectorProps) {
  const { t } = useTranslation('common');

  const ENTITY_OPTIONS: { value: LegalEntityFilter; label: string; flag: string }[] = [
    { value: 'all', label: t('financialSection.allEntities'), flag: '🌐' },
    { value: 'tqc_nl', label: t('financialSection.netherlands'), flag: '🇳🇱' },
    { value: 'tqc_dubai', label: t('financialSection.dubai'), flag: '🇦🇪' },
  ];
  return (
    <Select value={value} onValueChange={(v) => onChange(v as LegalEntityFilter)}>
      <SelectTrigger className="w-[160px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ENTITY_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            <span className="flex items-center gap-2">
              <span>{opt.flag}</span>
              <span>{opt.label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
