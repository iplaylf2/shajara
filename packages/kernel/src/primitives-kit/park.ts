import type { Wisp } from "#src/contracts";
import { channel } from "#src/contracts/channel";
import { pipe } from "fp-ts/function";
import { receive } from "#src/sigils";
import { wisp } from "#src/internal/fp";

export function park(): Wisp<never> {
  return pipe(
    receive(parkChannel),
    wisp.liftF,
    wisp.map(({ value }) => value),
  );
}

const parkChannel = channel<never>();
