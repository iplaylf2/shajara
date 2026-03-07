import type { Wisp } from "#src/contracts";
import { channel } from "#src/contracts/channel";
import { pipe } from "fp-ts/function";
import { plan } from "#src/internal/fp";
import { receive } from "#src/syscalls";

export function park(): Wisp<never> {
  return pipe(
    receive(parkChannel),
    plan.liftF,
    plan.map(({ value }) => value),
  );
}

const parkChannel = channel<never>();
