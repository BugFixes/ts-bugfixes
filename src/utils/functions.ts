/**
 * Utility functions.
 */

/**
 * Type guard: check if a value is defined (not undefined and not null).
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== undefined && value !== null;
}
