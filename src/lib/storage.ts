/** Browser storage can be blocked or full, and the site has to keep working when it is. */
export function readJson<T>(store: Storage | undefined, key: string): T | null {
  try {
    const raw = store?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeJson(store: Storage | undefined, key: string, value: unknown): boolean {
  try {
    store?.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export const local = typeof localStorage === "undefined" ? undefined : localStorage;
export const session = typeof sessionStorage === "undefined" ? undefined : sessionStorage;
