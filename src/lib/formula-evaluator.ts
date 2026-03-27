// Enhanced Formula Evaluator for Workspace Databases
// Supports: SUM, AVG, MIN, MAX, IF, CONCAT, NOW, DATE functions

type FormulaValue = string | number | boolean | Date | null;

interface EvaluationContext {
  rowData: Record<string, unknown>;
  columnTypes: Record<string, string>;
}

interface EvaluationResult {
  result: FormulaValue;
  error: string | null;
}

// Token types for the formula parser
type TokenType = 'NUMBER' | 'STRING' | 'IDENTIFIER' | 'FUNCTION' | 'OPERATOR' | 'PAREN' | 'COMMA' | 'COLUMN_REF';

interface Token {
  type: TokenType;
  value: string;
}

// Tokenize the formula
function tokenize(formula: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  
  while (i < formula.length) {
    const char = formula[i];
    
    // Skip whitespace
    if (/\s/.test(char)) {
      i++;
      continue;
    }
    
    // Column references: {Column Name} or prop("Column Name")
    if (char === '{') {
      const end = formula.indexOf('}', i);
      if (end !== -1) {
        tokens.push({ type: 'COLUMN_REF', value: formula.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    
    // prop("Column Name") syntax
    if (formula.slice(i, i + 5) === 'prop(') {
      const start = i + 6; // skip prop("
      const end = formula.indexOf('")', start);
      if (end !== -1) {
        tokens.push({ type: 'COLUMN_REF', value: formula.slice(start, end) });
        i = end + 2;
        continue;
      }
    }
    
    // String literals
    if (char === '"' || char === "'") {
      const quote = char;
      let value = '';
      i++;
      while (i < formula.length && formula[i] !== quote) {
        if (formula[i] === '\\' && i + 1 < formula.length) {
          value += formula[i + 1];
          i += 2;
        } else {
          value += formula[i];
          i++;
        }
      }
      tokens.push({ type: 'STRING', value });
      i++; // skip closing quote
      continue;
    }
    
    // Numbers (including decimals)
    if (/\d/.test(char) || (char === '.' && /\d/.test(formula[i + 1]))) {
      let value = '';
      while (i < formula.length && /[\d.]/.test(formula[i])) {
        value += formula[i];
        i++;
      }
      tokens.push({ type: 'NUMBER', value });
      continue;
    }
    
    // Operators
    if (/[+\-*/%<>=!&|]/.test(char)) {
      let op = char;
      if ((char === '<' || char === '>' || char === '=' || char === '!') && formula[i + 1] === '=') {
        op += '=';
        i++;
      } else if ((char === '&' && formula[i + 1] === '&') || (char === '|' && formula[i + 1] === '|')) {
        op += formula[i + 1];
        i++;
      }
      tokens.push({ type: 'OPERATOR', value: op });
      i++;
      continue;
    }
    
    // Parentheses
    if (char === '(' || char === ')') {
      tokens.push({ type: 'PAREN', value: char });
      i++;
      continue;
    }
    
    // Comma
    if (char === ',') {
      tokens.push({ type: 'COMMA', value: ',' });
      i++;
      continue;
    }
    
    // Identifiers (function names, keywords)
    if (/[a-zA-Z_]/.test(char)) {
      let value = '';
      while (i < formula.length && /[a-zA-Z0-9_]/.test(formula[i])) {
        value += formula[i];
        i++;
      }
      
      // Check if it's a function (followed by parenthesis)
      if (formula[i] === '(') {
        tokens.push({ type: 'FUNCTION', value: value.toUpperCase() });
      } else if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
        tokens.push({ type: 'STRING', value: value.toLowerCase() });
      } else {
        tokens.push({ type: 'IDENTIFIER', value });
      }
      continue;
    }
    
    // Skip unknown characters
    i++;
  }
  
  return tokens;
}

// Built-in functions
const FUNCTIONS: Record<string, (...args: FormulaValue[]) => FormulaValue> = {
  // Math functions
  SUM: (...args: number[]) => args.filter(n => typeof n === 'number' && !isNaN(n)).reduce((a, b) => a + b, 0),
  AVG: (...args: number[]) => {
    const nums = args.filter(n => typeof n === 'number' && !isNaN(n));
    return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
  },
  MIN: (...args: number[]) => {
    const nums = args.filter(n => typeof n === 'number' && !isNaN(n));
    return nums.length ? Math.min(...nums) : 0;
  },
  MAX: (...args: number[]) => {
    const nums = args.filter(n => typeof n === 'number' && !isNaN(n));
    return nums.length ? Math.max(...nums) : 0;
  },
  ABS: (n: number) => Math.abs(n),
  ROUND: (n: number, decimals: number = 0) => Number(n.toFixed(decimals)),
  FLOOR: (n: number) => Math.floor(n),
  CEIL: (n: number) => Math.ceil(n),
  POWER: (base: number, exp: number) => Math.pow(base, exp),
  SQRT: (n: number) => Math.sqrt(n),
  
  // String functions
  CONCAT: (...args: FormulaValue[]) => args.map(a => String(a ?? '')).join(''),
  LENGTH: (str: FormulaValue) => String(str ?? '').length,
  UPPER: (str: FormulaValue) => String(str ?? '').toUpperCase(),
  LOWER: (str: FormulaValue) => String(str ?? '').toLowerCase(),
  TRIM: (str: FormulaValue) => String(str ?? '').trim(),
  LEFT: (str: FormulaValue, n: FormulaValue) => String(str ?? '').slice(0, Number(n)),
  RIGHT: (str: FormulaValue, n: FormulaValue) => String(str ?? '').slice(-Number(n)),
  REPLACE: (str: FormulaValue, find: FormulaValue, replace: FormulaValue) => String(str ?? '').replace(String(find), String(replace)),
  CONTAINS: (str: FormulaValue, search: FormulaValue) => String(str ?? '').toLowerCase().includes(String(search ?? '').toLowerCase()),
  
  // Date functions
  NOW: () => new Date().toISOString(),
  TODAY: () => new Date().toISOString().split('T')[0],
  YEAR: (date: FormulaValue) => new Date(String(date)).getFullYear(),
  MONTH: (date: FormulaValue) => new Date(String(date)).getMonth() + 1,
  DAY: (date: FormulaValue) => new Date(String(date)).getDate(),
  DATE_DIFF: (date1: FormulaValue, date2: FormulaValue, unit: FormulaValue = 'days') => {
    const d1 = new Date(String(date1));
    const d2 = new Date(String(date2));
    const diffMs = d2.getTime() - d1.getTime();
    switch (String(unit).toLowerCase()) {
      case 'seconds': return Math.floor(diffMs / 1000);
      case 'minutes': return Math.floor(diffMs / 60000);
      case 'hours': return Math.floor(diffMs / 3600000);
      case 'days': return Math.floor(diffMs / 86400000);
      case 'weeks': return Math.floor(diffMs / 604800000);
      case 'months': return (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
      case 'years': return d2.getFullYear() - d1.getFullYear();
      default: return Math.floor(diffMs / 86400000);
    }
  },
  DATE_ADD: (date: FormulaValue, amount: FormulaValue, unit: FormulaValue = 'days') => {
    const d = new Date(String(date));
    const amountNum = Number(amount);
    switch (String(unit).toLowerCase()) {
      case 'seconds': d.setSeconds(d.getSeconds() + amountNum); break;
      case 'minutes': d.setMinutes(d.getMinutes() + amountNum); break;
      case 'hours': d.setHours(d.getHours() + amountNum); break;
      case 'days': d.setDate(d.getDate() + amountNum); break;
      case 'weeks': d.setDate(d.getDate() + amountNum * 7); break;
      case 'months': d.setMonth(d.getMonth() + amountNum); break;
      case 'years': d.setFullYear(d.getFullYear() + amountNum); break;
    }
    return d.toISOString();
  },
  
  // Logical functions
  IF: (condition: FormulaValue, trueValue: FormulaValue, falseValue: FormulaValue) => condition ? trueValue : falseValue,
  AND: (...args: FormulaValue[]) => args.every(Boolean),
  OR: (...args: FormulaValue[]) => args.some(Boolean),
  NOT: (value: FormulaValue) => !value,
  ISNULL: (value: FormulaValue) => value === null || value === undefined || value === '',
  COALESCE: (...args: FormulaValue[]) => args.find(a => a !== null && a !== undefined && a !== '') ?? null,

  // Type conversion
  NUMBER: (value: FormulaValue) => {
    const n = parseFloat(String(value));
    return isNaN(n) ? 0 : n;
  },
  TEXT: (value: FormulaValue) => String(value ?? ''),
  BOOLEAN: (value: FormulaValue) => Boolean(value),
};

// Evaluate a parsed formula
function evaluateTokens(tokens: Token[], context: EvaluationContext): FormulaValue {
  let pos = 0;
  
  function getValue(token: Token): FormulaValue {
    switch (token.type) {
      case 'NUMBER':
        return parseFloat(token.value);
      case 'STRING':
        if (token.value === 'true') return true;
        if (token.value === 'false') return false;
        return token.value;
      case 'COLUMN_REF':
        const colValue = context.rowData[token.value];
        if (colValue === undefined || colValue === null) return null;
        return colValue as FormulaValue;
      default:
        return null;
    }
  }
  
  function parseExpression(): FormulaValue {
    let left = parseTerm();
    
    while (pos < tokens.length) {
      const token = tokens[pos];
      if (token.type !== 'OPERATOR') break;
      
      const op = token.value;
      if (!['+', '-', '<', '>', '<=', '>=', '==', '!=', '&&', '||'].includes(op)) break;
      
      pos++;
      const right = parseTerm();
      
      switch (op) {
        case '+':
          left = (Number(left) || 0) + (Number(right) || 0);
          break;
        case '-':
          left = (Number(left) || 0) - (Number(right) || 0);
          break;
        case '<':
          left = Number(left) < Number(right);
          break;
        case '>':
          left = Number(left) > Number(right);
          break;
        case '<=':
          left = Number(left) <= Number(right);
          break;
        case '>=':
          left = Number(left) >= Number(right);
          break;
        case '==':
          left = left === right;
          break;
        case '!=':
          left = left !== right;
          break;
        case '&&':
          left = Boolean(left) && Boolean(right);
          break;
        case '||':
          left = Boolean(left) || Boolean(right);
          break;
      }
    }
    
    return left;
  }
  
  function parseTerm(): FormulaValue {
    let left = parseFactor();
    
    while (pos < tokens.length) {
      const token = tokens[pos];
      if (token.type !== 'OPERATOR' || !['*', '/', '%'].includes(token.value)) break;
      
      pos++;
      const right = parseFactor();
      
      switch (token.value) {
        case '*':
          left = (Number(left) || 0) * (Number(right) || 0);
          break;
        case '/':
          const divisor = Number(right) || 0;
          left = divisor !== 0 ? (Number(left) || 0) / divisor : 0;
          break;
        case '%':
          left = (Number(left) || 0) % (Number(right) || 1);
          break;
      }
    }
    
    return left;
  }
  
  function parseFactor(): FormulaValue {
    const token = tokens[pos];
    
    if (!token) return null;
    
    // Negative number
    if (token.type === 'OPERATOR' && token.value === '-') {
      pos++;
      return -(Number(parseFactor()) || 0);
    }
    
    // Parentheses
    if (token.type === 'PAREN' && token.value === '(') {
      pos++;
      const result = parseExpression();
      if (tokens[pos]?.type === 'PAREN' && tokens[pos].value === ')') {
        pos++;
      }
      return result;
    }
    
    // Function call
    if (token.type === 'FUNCTION') {
      const funcName = token.value;
      pos++;
      
      if (tokens[pos]?.type === 'PAREN' && tokens[pos].value === '(') {
        pos++;
        const args: FormulaValue[] = [];
        
        while (pos < tokens.length) {
          if (tokens[pos].type === 'PAREN' && tokens[pos].value === ')') {
            pos++;
            break;
          }
          
          if (tokens[pos].type === 'COMMA') {
            pos++;
            continue;
          }
          
          args.push(parseExpression());
        }
        
        const fn = FUNCTIONS[funcName];
        if (fn) {
          return fn(...args);
        }
        return null;
      }
    }
    
    // Value
    if (['NUMBER', 'STRING', 'COLUMN_REF'].includes(token.type)) {
      pos++;
      return getValue(token);
    }
    
    pos++;
    return null;
  }
  
  return parseExpression();
}

// Main evaluation function
export function evaluateFormula(formula: string, context: EvaluationContext): EvaluationResult {
  if (!formula || !formula.trim()) {
    return { result: null, error: null };
  }
  
  try {
    const tokens = tokenize(formula);
    const result = evaluateTokens(tokens, context);
    return { result, error: null };
  } catch (err) {
    return { 
      result: null, 
      error: err instanceof Error ? err.message : 'Invalid formula' 
    };
  }
}

// Format result for display
export function formatFormulaResult(value: FormulaValue): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return String(value);
    return value.toFixed(2);
  }
  if (value instanceof Date) return value.toLocaleDateString();
  return String(value);
}

// Get list of available functions for UI
export function getAvailableFunctions(): { name: string; description: string; example: string }[] {
  return [
    { name: 'SUM', description: 'Add numbers together', example: 'SUM({Price}, {Tax})' },
    { name: 'AVG', description: 'Calculate average', example: 'AVG({Score1}, {Score2})' },
    { name: 'MIN', description: 'Get minimum value', example: 'MIN({Value1}, {Value2})' },
    { name: 'MAX', description: 'Get maximum value', example: 'MAX({Value1}, {Value2})' },
    { name: 'IF', description: 'Conditional logic', example: 'IF({Status}=="Done", "✓", "○")' },
    { name: 'CONCAT', description: 'Join text', example: 'CONCAT({First}, " ", {Last})' },
    { name: 'NOW', description: 'Current date/time', example: 'NOW()' },
    { name: 'TODAY', description: 'Current date', example: 'TODAY()' },
    { name: 'DATE_DIFF', description: 'Days between dates', example: 'DATE_DIFF({Start}, {End}, "days")' },
    { name: 'CONTAINS', description: 'Check if text contains', example: 'CONTAINS({Name}, "John")' },
    { name: 'ISNULL', description: 'Check if empty', example: 'ISNULL({Email})' },
    { name: 'COALESCE', description: 'First non-empty value', example: 'COALESCE({Nick}, {Name})' },
  ];
}
