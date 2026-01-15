import { createReactBlockSpec } from '@blocknote/react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TableData {
  headers: string[];
  rows: string[][];
}

interface SimpleTableBlockRenderProps {
  block: {
    props: {
      tableData: string;
    };
  };
  editor: {
    updateBlock: (block: unknown, update: { props: { tableData: string } }) => void;
  };
}

function SimpleTableBlockRender(props: SimpleTableBlockRenderProps) {
  const [data, setData] = useState<TableData>(() => {
    try {
      return JSON.parse(props.block.props.tableData as string);
    } catch {
      return { headers: ['Column 1', 'Column 2'], rows: [['', '']] };
    }
  });

  useEffect(() => {
    try {
      setData(JSON.parse(props.block.props.tableData as string));
    } catch {
      // Keep current data
    }
  }, [props.block.props.tableData]);

  const saveData = (newData: TableData) => {
    setData(newData);
    props.editor.updateBlock(props.block, {
      props: { tableData: JSON.stringify(newData) },
    });
  };

  const updateHeader = (index: number, value: string) => {
    const newHeaders = [...data.headers];
    newHeaders[index] = value;
    saveData({ ...data, headers: newHeaders });
  };

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    const newRows = [...data.rows];
    newRows[rowIndex] = [...newRows[rowIndex]];
    newRows[rowIndex][colIndex] = value;
    saveData({ ...data, rows: newRows });
  };

  const addColumn = () => {
    const newHeaders = [...data.headers, `Column ${data.headers.length + 1}`];
    const newRows = data.rows.map(row => [...row, '']);
    saveData({ headers: newHeaders, rows: newRows });
  };

  const addRow = () => {
    const newRow = new Array(data.headers.length).fill('');
    saveData({ ...data, rows: [...data.rows, newRow] });
  };

  const removeColumn = (index: number) => {
    if (data.headers.length <= 1) return;
    const newHeaders = data.headers.filter((_, i) => i !== index);
    const newRows = data.rows.map(row => row.filter((_, i) => i !== index));
    saveData({ headers: newHeaders, rows: newRows });
  };

  const removeRow = (index: number) => {
    if (data.rows.length <= 1) return;
    const newRows = data.rows.filter((_, i) => i !== index);
    saveData({ ...data, rows: newRows });
  };

  return (
    <div className="my-4 overflow-x-auto" contentEditable={false}>
      <table className="w-full border-collapse border border-border rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-muted/50">
            {data.headers.map((header, i) => (
              <th key={i} className="border border-border p-0 relative group">
                <input
                  type="text"
                  value={header}
                  onChange={(e) => updateHeader(i, e.target.value)}
                  className={cn(
                    "w-full p-2 bg-transparent font-medium text-sm",
                    "focus:outline-none focus:bg-accent/10"
                  )}
                />
                {data.headers.length > 1 && (
                  <button
                    onClick={() => removeColumn(i)}
                    className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10 rounded"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </th>
            ))}
            <th className="border border-border p-1 w-8">
              <button
                onClick={addColumn}
                className="p-1 rounded hover:bg-accent/20 text-muted-foreground"
                title="Add column"
              >
                <Plus className="h-3 w-3" />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="group">
              {row.map((cell, colIndex) => (
                <td key={colIndex} className="border border-border p-0">
                  <input
                    type="text"
                    value={cell}
                    onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                    className={cn(
                      "w-full p-2 bg-transparent text-sm",
                      "focus:outline-none focus:bg-accent/10"
                    )}
                    placeholder=""
                  />
                </td>
              ))}
              <td className="border border-border p-1 w-8">
                {data.rows.length > 1 && (
                  <button
                    onClick={() => removeRow(rowIndex)}
                    className="p-1 opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10 rounded"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Button
        variant="ghost"
        size="sm"
        onClick={addRow}
        className="mt-1 text-xs text-muted-foreground"
      >
        <Plus className="h-3 w-3 mr-1" />
        Add row
      </Button>
    </div>
  );
}

export const SimpleTableBlock = createReactBlockSpec(
  {
    type: 'simpleTable',
    propSchema: {
      tableData: {
        default: JSON.stringify({
          headers: ['Column 1', 'Column 2', 'Column 3'],
          rows: [['', '', ''], ['', '', '']],
        }),
      },
    },
    content: 'none',
  },
  {
    render: (props) => <SimpleTableBlockRender {...props as unknown as SimpleTableBlockRenderProps} />,
  }
);
