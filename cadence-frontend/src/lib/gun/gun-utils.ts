/** Strip GunDB internal metadata from an object */
export function stripGunMeta<T extends Record<string, unknown>>(data: T): Omit<T, "_"> {
  if (!data || typeof data !== "object") return data;
  const { _, ...rest } = data;
  return rest as Omit<T, "_">;
}

/** Generate a simple unique ID */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
