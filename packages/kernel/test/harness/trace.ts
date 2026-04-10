import { wisp } from "#/internal/fp";

export function recordTrace(events: string[], entry: string) {
  return wisp.fromIO(() => {
    events.push(entry);
    return [...events] as readonly string[];
  });
}
