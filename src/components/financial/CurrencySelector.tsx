import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Currency, CURRENCY_SYMBOLS, CURRENCY_NAMES } from '@/lib/currencyConversion';

const FINANCE_CURRENCIES: Currency[] = ['EUR', 'USD', 'GBP', 'AED'];

interface CurrencySelectorProps {
  value: Currency;
  onChange: (c: Currency) => void;
}

export function CurrencySelector({ value, onChange }: CurrencySelectorProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Currency)}>
      <SelectTrigger className="w-[130px] h-8 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {FINANCE_CURRENCIES.map((c) => (
          <SelectItem key={c} value={c}>
            {CURRENCY_SYMBOLS[c]} {CURRENCY_NAMES[c]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
