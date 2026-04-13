import type { Wisp } from "#/contracts";
import { wisp } from "#/internal/fp";

export function recordTrace(events: string[], entry: string): Wisp<readonly string[]> {
  return wisp.fromIO(() => {
    events.push(entry);
    return [...events] as readonly string[];
  });
}
