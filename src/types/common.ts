/**
 * Common Utility Types
 * 
 * Reusable utility types and type helpers used throughout the application.
 * These promote type safety and reduce duplication.
 */

// ============= Utility Types =============

/**
 * Makes all properties optional recursively
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Makes all properties required recursively
 */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

/**
 * Makes specified keys required
 */
export type RequireKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Makes specified keys optional
 */
export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Extracts only the keys that have a specific type
 */
export type KeysOfType<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never;
}[keyof T];

/**
 * Creates a union of all possible dot-notation paths in an object
 */
export type DotPath<T, Prefix extends string = ''> = {
  [K in keyof T]: K extends string
    ? T[K] extends object
      ? `${Prefix}${K}` | DotPath<T[K], `${Prefix}${K}.`>
      : `${Prefix}${K}`
    : never;
}[keyof T];

/**
 * Gets the type of a nested property using dot notation
 */
export type DotPathValue<T, P extends string> = 
  P extends `${infer K}.${infer Rest}`
    ? K extends keyof T
      ? DotPathValue<T[K], Rest>
      : never
    : P extends keyof T
      ? T[P]
      : never;

/**
 * Ensure at least one of the keys is present
 */
export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = 
  Pick<T, Exclude<keyof T, Keys>> & 
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys];

/**
 * Ensure only one of the keys is present
 */
export type RequireOnlyOne<T, Keys extends keyof T = keyof T> = 
  Pick<T, Exclude<keyof T, Keys>> & 
  {
    [K in Keys]: Required<Pick<T, K>> & Partial<Record<Exclude<Keys, K>, never>>;
  }[Keys];

/**
 * Make a type nullable
 */
export type Nullable<T> = T | null;

/**
 * Make all properties nullable
 */
export type NullableObject<T> = {
  [P in keyof T]: Nullable<T[P]>;
};

/**
 * Extract non-nullable type
 */
export type NonNullableObject<T> = {
  [P in keyof T]: NonNullable<T[P]>;
};

/**
 * Create a type that's either T or null/undefined but not both
 */
export type Maybe<T> = T | null | undefined;

/**
 * Unwrap a Promise type
 */
export type Awaited<T> = T extends Promise<infer U> ? U : T;

/**
 * Extract the element type from an array
 */
export type ArrayElement<T> = T extends (infer E)[] ? E : T;

/**
 * Extract function parameters as tuple
 */
export type FunctionParams<T extends (...args: any[]) => any> = T extends (...args: infer P) => any ? P : never;

/**
 * Extract function return type
 */
export type FunctionReturn<T extends (...args: any[]) => any> = T extends (...args: any[]) => infer R ? R : never;

// ============= Branding Types =============

/**
 * Create a branded/nominal type
 */
export type Brand<T, B> = T & { __brand: B };

/**
 * Common branded types for domain modeling
 */
export type UserId = Brand<string, 'UserId'>;
export type JobId = Brand<string, 'JobId'>;
export type ApplicationId = Brand<string, 'ApplicationId'>;
export type MeetingId = Brand<string, 'MeetingId'>;
export type CompanyId = Brand<string, 'CompanyId'>;
export type Email = Brand<string, 'Email'>;
export type PhoneNumber = Brand<string, 'PhoneNumber'>;
export type URL = Brand<string, 'URL'>;
export type ISODateString = Brand<string, 'ISODateString'>;
export type UUID = Brand<string, 'UUID'>;

// ============= Result Types =============

/**
 * Result type for operations that can fail
 */
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Async result type
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

/**
 * Option type (similar to Rust's Option)
 */
export type Option<T> = T | null | undefined;

// ============= Status Types =============

/**
 * Generic status enum
 */
export type Status = 'idle' | 'loading' | 'success' | 'error';

/**
 * Request state with data
 */
export interface RequestState<T, E = Error> {
  status: Status;
  data: Option<T>;
  error: Option<E>;
}

/**
 * Async operation state
 */
export interface AsyncState<T = unknown> {
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  data: Option<T>;
  error: Option<Error>;
}

// ============= Validation Types =============

/**
 * Validation error
 */
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

/**
 * Validation result
 */
export type ValidationResult<T> = 
  | { valid: true; data: T }
  | { valid: false; errors: ValidationError[] };

// ============= Event Types =============

/**
 * Event handler type
 */
export type EventHandler<T = void> = (event: T) => void;

/**
 * Async event handler
 */
export type AsyncEventHandler<T = void> = (event: T) => Promise<void>;

/**
 * Callback function
 */
export type Callback<T = void> = () => T;

/**
 * Async callback
 */
export type AsyncCallback<T = void> = () => Promise<T>;

// ============= Time Types =============

/**
 * Duration in milliseconds
 */
export type Duration = number;

/**
 * Timestamp (Unix epoch milliseconds)
 */
export type Timestamp = number;

/**
 * ISO 8601 date string
 */
export type ISODate = string;

/**
 * Time range
 */
export interface TimeRange {
  start: Date | string;
  end: Date | string;
}

// ============= Sorting & Filtering =============

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Sort configuration
 */
export interface SortConfig<T = string> {
  field: T;
  direction: SortDirection;
}

/**
 * Filter operator
 */
export type FilterOperator = 
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'greaterThan'
  | 'lessThan'
  | 'greaterThanOrEqual'
  | 'lessThanOrEqual'
  | 'in'
  | 'notIn'
  | 'between'
  | 'isNull'
  | 'isNotNull';

/**
 * Filter condition
 */
export interface FilterCondition<T = unknown> {
  field: string;
  operator: FilterOperator;
  value: T;
}

/**
 * Filter group (for complex queries)
 */
export interface FilterGroup {
  operator: 'AND' | 'OR';
  conditions: (FilterCondition | FilterGroup)[];
}

// ============= Pagination =============

/**
 * Pagination params
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
}

/**
 * Pagination info
 */
export interface PaginationInfo extends PaginationParams {
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Paginated data
 */
export interface PaginatedData<T> {
  items: T[];
  pagination: PaginationInfo;
}

// ============= Color & Theme =============

/**
 * Color scheme
 */
export type ColorScheme = 'light' | 'dark' | 'system';

/**
 * Theme color
 */
export type ThemeColor = 
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'muted';

/**
 * Size variant
 */
export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

// ============= Geographic Types =============

/**
 * Coordinates
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Address
 */
export interface Address {
  street?: string;
  city?: string;
  state?: string;
  country: string;
  postalCode?: string;
  coordinates?: Coordinates;
}

// ============= Money Types =============

/**
 * Currency code (ISO 4217)
 */
export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CAD' | 'AUD';

/**
 * Money amount
 */
export interface Money {
  amount: number;
  currency: CurrencyCode;
}

/**
 * Salary range
 */
export interface SalaryRange {
  min: Money;
  max: Money;
}

// ============= File Types =============

/**
 * File metadata
 */
export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: Date;
  uploadedBy?: string;
}

/**
 * Image metadata
 */
export interface ImageMetadata extends FileMetadata {
  width?: number;
  height?: number;
  alt?: string;
}

// ============= Generic Action Types =============

/**
 * Generic action creator
 */
export interface Action<T = string, P = unknown> {
  type: T;
  payload?: P;
}

/**
 * Async action states
 */
export type AsyncAction<T extends string> = 
  | Action<`${T}_PENDING`>
  | Action<`${T}_SUCCESS`, unknown>
  | Action<`${T}_ERROR`, Error>;

// ============= Type Guards =============

/**
 * Check if value is defined (not null or undefined)
 */
export const isDefined = <T>(value: T | null | undefined): value is T => {
  return value !== null && value !== undefined;
};

/**
 * Check if value is a string
 */
export const isString = (value: unknown): value is string => {
  return typeof value === 'string';
};

/**
 * Check if value is a number
 */
export const isNumber = (value: unknown): value is number => {
  return typeof value === 'number' && !isNaN(value);
};

/**
 * Check if value is an object
 */
export const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

/**
 * Check if value is an array
 */
export const isArray = <T>(value: unknown): value is T[] => {
  return Array.isArray(value);
};
