import React from 'react';
import { DatabaseColumn } from '@/hooks/useWorkspaceDatabase';
import { TextCell } from './TextCell';
import { NumberCell } from './NumberCell';
import { DateCell } from './DateCell';
import { CheckboxCell } from './CheckboxCell';
import { SelectCell } from './SelectCell';
import { MultiSelectCell } from './MultiSelectCell';
import { UrlCell } from './UrlCell';

interface DatabaseCellProps {
  column: DatabaseColumn;
  value: unknown;
  onChange: (value: unknown) => void;
  onAddOption?: (option: { value: string; color: string }) => void;
}

export function DatabaseCell({ column, value, onChange, onAddOption }: DatabaseCellProps) {
  switch (column.column_type) {
    case 'text':
    case 'email':
    case 'phone':
      return <TextCell value={value as string} onChange={onChange} placeholder={column.column_type === 'email' ? 'email@example.com' : undefined} />;
    
    case 'number':
      return <NumberCell value={value as number} onChange={onChange} />;
    
    case 'date':
    case 'created_time':
    case 'updated_time':
      return <DateCell value={value as string} onChange={onChange} readOnly={column.column_type !== 'date'} />;
    
    case 'checkbox':
      return <CheckboxCell value={value as boolean} onChange={onChange} />;
    
    case 'select':
      return <SelectCell value={value as string} onChange={onChange} options={column.options} isMulti={false} />;
    
    case 'multi_select':
      return (
        <MultiSelectCell 
          value={value as string[]} 
          onChange={onChange} 
          options={column.options}
          onAddOption={onAddOption}
        />
      );
    
    case 'url':
      return <UrlCell value={value as string} onChange={onChange} />;
    
    case 'person':
      return <TextCell value={value as string} onChange={onChange} placeholder="Person..." />;
    
    case 'relation':
      return <TextCell value={value as string} onChange={onChange} placeholder="Link..." />;
    
    case 'formula':
      return <TextCell value={value as string} onChange={onChange} readOnly />;
    
    default:
      return <TextCell value={value as string} onChange={onChange} />;
  }
}
