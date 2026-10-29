let previous: string | null = null;

export function changedSinceLastRun(serialized: string | null): boolean {
  if (serialized === null) {
    return false;
  }
  const changed = previous !== null && previous !== serialized;
  previous = serialized;
  return changed;
}
