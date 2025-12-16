import React from 'react';
import { DatabaseColumn } from '@/hooks/useWorkspaceDatabase';
import { TextCell } from './TextCell';
import { NumberCell } from './NumberCell';
import { DateCell } from './DateCell';
import { CheckboxCell } from './CheckboxCell';
import { SelectCell } from './SelectCell';
import { MultiSelectCell } from './MultiSelectCell';
import { UrlCell } from './UrlCell';
import { PersonCell } from './PersonCell';
import { RelationCell } from './RelationCell';
import { FormulaCell } from './FormulaCell';

interface DatabaseCellProps {
  column: DatabaseColumn;
  value: unknown;
  onChange: (value: unknown) => void;
  onAddOption?: (option: { value: string; color: string }) => void;
  rowData?: Record<string, unknown>;
  columnTypes?: Record<string, string>;
}

export function DatabaseCell({ column, value, onChange, onAddOption, rowData = {}, columnTypes = {} }: DatabaseCellProps) {
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
      return (
        <PersonCell 
          value={value as any} 
          onChange={onChange} 
          multiple={false}
        />
      );
    
    case 'relation':
      return (
        <RelationCell 
          value={value as any} 
          onChange={onChange}
          relationDatabaseId={(column.options as any)?.relationDatabaseId}
          multiple={true}
        />
      );
    
    case 'formula':
      return (
        <FormulaCell 
          formula={(column.options as any)?.formula || ''} 
          rowData={rowData}
          columnTypes={columnTypes}
          readOnly={true}
        />
      );
    
    default:
      return <TextCell value={value as string} onChange={onChange} />;
  }
}
