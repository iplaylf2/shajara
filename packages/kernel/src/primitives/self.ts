import type { Plan } from "#src/contracts/plan";
import type { SelfDescriptor } from "#src/syscalls";
import { notImplemented } from "#src/internal/not-implemented";

export function self<Descriptor extends SelfDescriptor = SelfDescriptor>(): Plan<Descriptor> {
  return notImplemented("kernel primitive 'self'");
}
