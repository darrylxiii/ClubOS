/**
 * UUID Utility Functions
 * Provides type-safe UUID generation and validation
 */

/**
 * Generates a cryptographically secure UUID v4
 * @returns A valid UUID string
 * @example
 * const id = generateUUID(); // "550e8400-e29b-41d4-a716-446655440000"
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Validates whether a string is a valid UUID v4
 * @param uuid - The string to validate
 * @returns True if valid UUID, false otherwise
 * @example
 * isValidUUID("550e8400-e29b-41d4-a716-446655440000"); // true
 * isValidUUID("invalid-uuid"); // false
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Generates a human-readable reference number with prefix
 * @param prefix - The prefix for the reference number
 * @returns A reference string like "MNL-1763600349785"
 * @example
 * generateReference("INC"); // "INC-1763600349785"
 */
export function generateReference(prefix: string): string {
  return `${prefix}-${Date.now()}`;
}
