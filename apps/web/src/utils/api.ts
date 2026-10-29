export function apiUrl(path: string): string {
  const configured = import.meta.env.VITE_API_URL;
  const base = (configured && configured.length > 0 ? configured : "http://localhost:3001").replace(/\/$/, "");
  return `${base}${path}`;
}

export async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(apiUrl(path));
  if (!response.ok) {
    throw new Error(`Request failed: ${path}`);
  }
  return (await response.json()) as T;
}

export async function postJson<T>(path: string): Promise<T> {
  const response = await fetch(apiUrl(path), { method: "POST" });
  if (!response.ok) {
    throw new Error(`Request failed: ${path}`);
  }
  return (await response.json()) as T;
}
