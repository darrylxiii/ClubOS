/**
 * Component Prop Types
 * 
 * Shared prop types for reusable components across the application.
 * Promotes consistency and type safety in component interfaces.
 */

import { ReactNode, ComponentPropsWithoutRef, ElementType } from 'react';
import { LucideIcon } from 'lucide-react';

// ============= Base Component Props =============

export interface BaseComponentProps {
  className?: string;
  children?: ReactNode;
  testId?: string;
}

export interface PolymorphicComponentProps<T extends ElementType = 'div'> extends BaseComponentProps {
  as?: T;
}

// ============= Button & Action Props =============

export interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  isLoading?: boolean;
  loadingText?: string;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
}

export interface IconButtonProps extends Omit<ButtonProps, 'children'> {
  icon: LucideIcon;
  label: string;
  tooltipSide?: 'top' | 'right' | 'bottom' | 'left';
}

// ============= Form Component Props =============

export interface FormFieldProps extends BaseComponentProps {
  name: string;
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

export interface InputProps extends ComponentPropsWithoutRef<'input'>, FormFieldProps {
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
  onRightIconClick?: () => void;
}

export interface TextareaProps extends ComponentPropsWithoutRef<'textarea'>, FormFieldProps {
  maxLength?: number;
  showCharCount?: boolean;
  autoResize?: boolean;
}

export interface SelectProps extends FormFieldProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchable?: boolean;
  clearable?: boolean;
  multiple?: boolean;
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: LucideIcon;
  description?: string;
}

export interface CheckboxProps extends Omit<ComponentPropsWithoutRef<'input'>, 'type'>, FormFieldProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export interface SwitchProps extends FormFieldProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
}

export interface RadioGroupProps extends FormFieldProps {
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  orientation?: 'horizontal' | 'vertical';
}

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

// ============= Data Display Props =============

export interface CardProps extends BaseComponentProps {
  variant?: 'default' | 'elevated' | 'outline' | 'ghost';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  clickable?: boolean;
  onClick?: () => void;
  header?: ReactNode;
  footer?: ReactNode;
}

export interface BadgeProps extends BaseComponentProps {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
}

export interface AvatarProps extends BaseComponentProps {
  src?: string | null;
  alt: string;
  fallback?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'away' | 'offline';
  onClick?: () => void;
}

export interface StatCardProps extends BaseComponentProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: {
    value: number;
    direction: 'up' | 'down';
    label?: string;
  };
  subtitle?: string;
  loading?: boolean;
}

// ============= Table Component Props =============

export interface TableColumn<T = unknown> {
  key: string;
  header: string;
  accessor: keyof T | ((row: T) => ReactNode);
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: unknown, row: T) => ReactNode;
}

export interface TableProps<T = unknown> extends BaseComponentProps {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  sortable?: boolean;
  selectable?: boolean;
  selectedRows?: Set<string>;
  onSelectionChange?: (selectedIds: Set<string>) => void;
  getRowId?: (row: T) => string;
}

export interface PaginationProps extends BaseComponentProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

// ============= Modal & Dialog Props =============

export interface DialogProps extends BaseComponentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnEscape?: boolean;
  closeOnOutsideClick?: boolean;
}

export interface ConfirmDialogProps extends Omit<DialogProps, 'footer'> {
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  variant?: 'default' | 'destructive';
  loading?: boolean;
}

export interface DrawerProps extends BaseComponentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side?: 'left' | 'right' | 'top' | 'bottom';
  title?: string;
  description?: string;
  footer?: ReactNode;
}

// ============= Navigation Props =============

export interface NavigationItem {
  id: string;
  label: string;
  href?: string;
  icon?: LucideIcon;
  badge?: string | number;
  onClick?: () => void;
  children?: NavigationItem[];
  disabled?: boolean;
  external?: boolean;
}

export interface SidebarProps extends BaseComponentProps {
  items: NavigationItem[];
  activeItemId?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  header?: ReactNode;
  footer?: ReactNode;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: LucideIcon;
}

export interface BreadcrumbsProps extends BaseComponentProps {
  items: BreadcrumbItem[];
  separator?: ReactNode;
}

export interface TabItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  badge?: string | number;
  disabled?: boolean;
  content?: ReactNode;
}

export interface TabsProps extends BaseComponentProps {
  items: TabItem[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
  variant?: 'default' | 'pills' | 'underline';
  orientation?: 'horizontal' | 'vertical';
}

// ============= Feedback Component Props =============

export interface AlertProps extends BaseComponentProps {
  variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info';
  title?: string;
  description?: string;
  icon?: LucideIcon;
  closable?: boolean;
  onClose?: () => void;
}

export interface ToastProps extends BaseComponentProps {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ProgressProps extends BaseComponentProps {
  value: number;
  max?: number;
  showLabel?: boolean;
  label?: string;
  variant?: 'default' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
}

export interface SkeletonProps extends BaseComponentProps {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export interface EmptyStateProps extends BaseComponentProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
}

// ============= File Upload Props =============

export interface FileUploadProps extends BaseComponentProps {
  accept?: string;
  maxSize?: number;
  maxFiles?: number;
  multiple?: boolean;
  onUpload: (files: File[]) => void | Promise<void>;
  value?: File[];
  disabled?: boolean;
  loading?: boolean;
  error?: string;
  preview?: boolean;
}

export interface FilePreviewProps extends BaseComponentProps {
  file: File | { name: string; url: string; size: number };
  onRemove?: () => void;
  onDownload?: () => void;
  showActions?: boolean;
}

// ============= Search & Filter Props =============

export interface SearchBarProps extends BaseComponentProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onSearch?: (value: string) => void;
  loading?: boolean;
  suggestions?: string[];
  clearable?: boolean;
  debounceMs?: number;
}

export interface FilterPanelProps extends BaseComponentProps {
  filters: FilterConfig[];
  values: Record<string, unknown>;
  onChange: (filters: Record<string, unknown>) => void;
  onReset?: () => void;
  collapsible?: boolean;
}

export interface FilterConfig {
  key: string;
  label: string;
  type: 'select' | 'multiselect' | 'range' | 'date' | 'daterange' | 'boolean';
  options?: SelectOption[];
  min?: number;
  max?: number;
  placeholder?: string;
}

// ============= Chart Props =============

export interface ChartProps extends BaseComponentProps {
  data: unknown[];
  type?: 'line' | 'bar' | 'area' | 'pie' | 'donut';
  height?: number;
  loading?: boolean;
  emptyMessage?: string;
  legend?: boolean;
  tooltip?: boolean;
  colors?: string[];
}

// ============= Calendar Props =============

export interface CalendarProps extends BaseComponentProps {
  mode?: 'single' | 'multiple' | 'range';
  selected?: Date | Date[];
  onSelect?: (date: Date | Date[] | undefined) => void;
  disabled?: (date: Date) => boolean;
  minDate?: Date;
  maxDate?: Date;
  events?: CalendarEvent[];
}

export interface CalendarEvent {
  id: string;
  date: Date;
  title: string;
  color?: string;
  onClick?: () => void;
}

// ============= Video Meeting Props =============

export interface VideoTileProps extends BaseComponentProps {
  stream?: MediaStream;
  muted?: boolean;
  name: string;
  avatar?: string;
  isLocal?: boolean;
  isMuted?: boolean;
  isVideoOff?: boolean;
  connectionQuality?: 'excellent' | 'good' | 'poor';
  isScreenShare?: boolean;
}

export interface MeetingControlsProps extends BaseComponentProps {
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenShareEnabled: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onLeave: () => void;
  onToggleChat?: () => void;
  onToggleParticipants?: () => void;
  showChat?: boolean;
  showParticipants?: boolean;
  disabled?: boolean;
}
