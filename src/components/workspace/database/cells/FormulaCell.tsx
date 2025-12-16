import React, { useMemo, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calculator, AlertCircle, Check } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface FormulaCellProps {
  formula: string;
  rowData: Record<string, unknown>;
  columnTypes: Record<string, string>;
  onFormulaChange?: (formula: string) => void;
  readOnly?: boolean;
}

// Simple formula parser and evaluator
function evaluateFormula(
  formula: string, 
  rowData: Record<string, unknown>,
  columnTypes: Record<string, string>
): { result: unknown; error: string | null } {
  try {
    if (!formula) return { result: '', error: null };
    
    // Replace column references with actual values
    let expression = formula;
    
    // Match column references like {Column Name} or prop("Column Name")
    const columnRefRegex = /\{([^}]+)\}|prop\("([^"]+)"\)/g;
    expression = expression.replace(columnRefRegex, (match, col1, col2) => {
      const colName = col1 || col2;
      const value = rowData[colName];
      if (value === undefined || value === null) return '0';
      if (typeof value === 'number') return String(value);
      if (typeof value === 'string') return `"${value}"`;
      if (typeof value === 'boolean') return value ? 'true' : 'false';
      return '0';
    });

    // Handle built-in functions
    const functions: Record<string, (...args: number[]) => number | string> = {
      SUM: (...args) => args.reduce((a, b) => a + b, 0),
      AVG: (...args) => args.length ? args.reduce((a, b) => a + b, 0) / args.length : 0,
      MIN: (...args) => Math.min(...args),
      MAX: (...args) => Math.max(...args),
      ABS: (n) => Math.abs(n),
      ROUND: (n, decimals = 0) => Number(n.toFixed(decimals)),
      FLOOR: (n) => Math.floor(n),
      CEIL: (n) => Math.ceil(n),
      CONCAT: (...args) => args.join(''),
      LENGTH: (str) => String(str).length,
      UPPER: (str) => String(str).toUpperCase(),
      LOWER: (str) => String(str).toLowerCase(),
      NOW: () => Date.now(),
      TODAY: () => new Date().toISOString().split('T')[0],
    };

    // Replace function calls
    Object.entries(functions).forEach(([name, fn]) => {
      const fnRegex = new RegExp(`${name}\\(([^)]*)\\)`, 'gi');
      expression = expression.replace(fnRegex, (match, args) => {
        try {
          const parsedArgs = args
            .split(',')
            .map((a: string) => a.trim())
            .filter((a: string) => a)
            .map((a: string) => {
              if (a.startsWith('"') && a.endsWith('"')) return a.slice(1, -1);
              const num = parseFloat(a);
              return isNaN(num) ? a : num;
            });
          const result = fn(...parsedArgs as number[]);
          return typeof result === 'string' ? `"${result}"` : String(result);
        } catch {
          return '0';
        }
      });
    });

    // Handle IF statements: IF(condition, trueValue, falseValue)
    const ifRegex = /IF\(([^,]+),([^,]+),([^)]+)\)/gi;
    expression = expression.replace(ifRegex, (match, condition, trueVal, falseVal) => {
      try {
        // Simple condition evaluation
        const evalCondition = new Function(`return ${condition}`)();
        return evalCondition ? trueVal.trim() : falseVal.trim();
      } catch {
        return falseVal.trim();
      }
    });

    // Evaluate basic math expressions safely
    // Only allow numbers, operators, and parentheses
    const safeExpression = expression.replace(/[^0-9+\-*/().,"'\s]/g, '');
    
    if (safeExpression.match(/^[\d+\-*/().\s]+$/)) {
      const result = new Function(`return ${safeExpression}`)();
      return { result, error: null };
    }

    // For string results, remove quotes
    if (expression.startsWith('"') && expression.endsWith('"')) {
      return { result: expression.slice(1, -1), error: null };
    }

    return { result: expression, error: null };
  } catch (err) {
    return { result: null, error: err instanceof Error ? err.message : 'Invalid formula' };
  }
}

export function FormulaCell({ 
  formula, 
  rowData, 
  columnTypes,
  onFormulaChange,
  readOnly = true 
}: FormulaCellProps) {
  const [open, setOpen] = useState(false);
  const [editedFormula, setEditedFormula] = useState(formula);

  const { result, error } = useMemo(() => 
    evaluateFormula(formula, rowData, columnTypes),
    [formula, rowData, columnTypes]
  );

  const handleSave = () => {
    onFormulaChange?.(editedFormula);
    setOpen(false);
  };

  const formatResult = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'number') {
      if (Number.isInteger(value)) return String(value);
      return value.toFixed(2);
    }
    return String(value);
  };

  if (readOnly && !onFormulaChange) {
    return (
      <div className="px-2 py-1 text-sm">
        {error ? (
          <span className="text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Error
          </span>
        ) : (
          <span className="text-muted-foreground">{formatResult(result)}</span>
        )}
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="w-full h-auto min-h-[32px] justify-start px-2 py-1 font-normal"
        >
          {error ? (
            <span className="text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              <span className="text-xs">Error</span>
            </span>
          ) : result !== null && result !== '' ? (
            <span className="text-sm">{formatResult(result)}</span>
          ) : (
            <span className="text-muted-foreground flex items-center gap-1">
              <Calculator className="h-3 w-3" />
              <span className="text-xs">Add formula...</span>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">Formula Editor</span>
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs">Formula</Label>
            <Input
              value={editedFormula}
              onChange={(e) => setEditedFormula(e.target.value)}
              placeholder="e.g., {Price} * {Quantity}"
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Preview</Label>
            <div className="p-2 rounded bg-muted text-sm">
              {evaluateFormula(editedFormula, rowData, columnTypes).error ? (
                <span className="text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {evaluateFormula(editedFormula, rowData, columnTypes).error}
                </span>
              ) : (
                <span>{formatResult(evaluateFormula(editedFormula, rowData, columnTypes).result)}</span>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Available functions</Label>
            <div className="flex flex-wrap gap-1">
              {['SUM', 'AVG', 'MIN', 'MAX', 'IF', 'CONCAT', 'NOW'].map(fn => (
                <Badge key={fn} variant="secondary" className="text-[10px]">
                  {fn}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Check className="h-3 w-3 mr-1" />
              Save
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
