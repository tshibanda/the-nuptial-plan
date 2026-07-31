/** Coerce Drizzle numeric() string fields to JS numbers so Zod doesn't reject them. */
export function coerceNumeric<T extends Record<string, unknown>>(
  row: T,
  fields: (keyof T)[]
): T {
  const result = { ...row };
  for (const field of fields) {
    const val = result[field];
    if (typeof val === "string") {
      (result as Record<string, unknown>)[field as string] = parseFloat(val);
    }
  }
  return result;
}
