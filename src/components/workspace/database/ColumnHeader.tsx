import React, { useState } from 'react';
import { DatabaseColumn, ColumnType } from '@/hooks/useWorkspaceDatabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChevronDown,
  Type,
  Hash,
  Calendar,
  CheckSquare,
  List,
  User,
  Link,
  Mail,
  Phone,
  ArrowRight,
  Clock,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
} from 'lucide-react';

interface ColumnHeaderProps {
  column: DatabaseColumn;
  onUpdate: (updates: Partial<DatabaseColumn>) => void;
  onDelete: () => void;
}

const columnTypeIcons: Record<ColumnType, React.ReactNode> = {
  text: <Type className="h-3.5 w-3.5" />,
  number: <Hash className="h-3.5 w-3.5" />,
  date: <Calendar className="h-3.5 w-3.5" />,
  checkbox: <CheckSquare className="h-3.5 w-3.5" />,
  select: <List className="h-3.5 w-3.5" />,
  multi_select: <List className="h-3.5 w-3.5" />,
  person: <User className="h-3.5 w-3.5" />,
  url: <Link className="h-3.5 w-3.5" />,
  email: <Mail className="h-3.5 w-3.5" />,
  phone: <Phone className="h-3.5 w-3.5" />,
  relation: <ArrowRight className="h-3.5 w-3.5" />,
  formula: <Hash className="h-3.5 w-3.5" />,
  created_time: <Clock className="h-3.5 w-3.5" />,
  updated_time: <Clock className="h-3.5 w-3.5" />,
};

const columnTypeLabels: Record<ColumnType, string> = {
  text: 'Text',
  number: 'Number',
  date: 'Date',
  checkbox: 'Checkbox',
  select: 'Select',
  multi_select: 'Multi-select',
  person: 'Person',
  url: 'URL',
  email: 'Email',
  phone: 'Phone',
  relation: 'Relation',
  formula: 'Formula',
  created_time: 'Created time',
  updated_time: 'Updated time',
};

export function ColumnHeader({ column, onUpdate, onDelete }: ColumnHeaderProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState(column.name);
  const [editType, setEditType] = useState(column.column_type);

  const handleSave = () => {
    onUpdate({ name: editName, column_type: editType });
    setIsEditDialogOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 px-2 gap-1.5 w-full justify-start font-normal">
            {columnTypeIcons[column.column_type]}
            <span className="truncate">{column.name}</span>
            <ChevronDown className="h-3 w-3 ml-auto opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit property
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onUpdate({ is_visible: !column.is_visible })}>
            {column.is_visible ? (
              <>
                <EyeOff className="h-4 w-4 mr-2" />
                Hide column
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Show column
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onClick={onDelete}
            disabled={column.is_primary}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete property
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit property</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Property name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Property type</Label>
              <Select value={editType} onValueChange={(v) => setEditType(v as ColumnType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(columnTypeLabels) as ColumnType[]).map((type) => (
                    <SelectItem key={type} value={type}>
                      <div className="flex items-center gap-2">
                        {columnTypeIcons[type]}
                        <span>{columnTypeLabels[type]}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
