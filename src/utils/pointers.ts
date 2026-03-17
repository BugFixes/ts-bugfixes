/**
 * Utility to wrap a value for optional/nullable usage.
 * In TypeScript this is less necessary than Go, but provided for API parity.
 */
export function toOptional<T>(value: T): T | undefined {
  return value;
}
