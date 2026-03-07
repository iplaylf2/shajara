// oxlint-disable id-length
import type { Wisp, Sigil } from "#src/contracts";
import type { applicative, apply, functor, monad, pointed } from "fp-ts";
import { chain as fpChain, fromIO as fpFromIO, pipeable, readonlyArray } from "fp-ts";
import { evoke, stirringWisp, restingWisp } from "#src/contracts";
import { lifting } from "./lifting";
import type { syscall } from "./syscall";

declare module "fp-ts/HKT" {
  interface URItoKind<A> {
    readonly [plan.URI]: Wisp<A>;
  }
}

export namespace plan {
  export const URI = "Wisp";
  export type URI = typeof URI;

  export const pure = restingWisp;
  export const impure = stirringWisp;

  export const Pointed: pointed.Pointed1<URI> = {
    URI,
    of: pure,
  };

  export const Functor: functor.Functor1<URI> = {
    URI,
    map: (fa, f) =>
      fa.bearing === "resting"
        ? pure(f(fa.relic))
        : impure(fa.sigil, (x) => Functor.map(fa.resonance(x), f)),
  };

  export const Apply: apply.Apply1<URI> = {
    URI,
    ap: (fab, fa) =>
      fab.bearing === "resting"
        ? Functor.map(fa, fab.relic)
        : impure(fab.sigil, (x) => Apply.ap(fab.resonance(x), fa)),
    map: Functor.map,
  };

  export const Applicative: applicative.Applicative1<URI> = {
    URI,
    ap: Apply.ap,
    map: Functor.map,
    of: Pointed.of,
  };

  export const Chain: fpChain.Chain1<URI> = {
    URI,
    ap: Apply.ap,
    chain: (fa, f) =>
      fa.bearing === "resting"
        ? f(fa.relic)
        : impure(fa.sigil, (x) => Chain.chain(fa.resonance(x), f)),
    map: Functor.map,
  };

  export const Monad: monad.Monad1<URI> = {
    URI,
    ap: Apply.ap,
    chain: Chain.chain,
    map: Functor.map,
    of: Pointed.of,
  };

  export const Do = pure(null);

  export const Lifting: lifting.Lifting<URI, syscall.URI, Sigil> = {
    URI,
    ap: Apply.ap,
    chain: Chain.chain,
    liftF: evoke,
    map: Functor.map,
  };

  export const FromIO: fpFromIO.FromIO1<URI> = {
    URI,
    fromIO: (fa) => Pointed.of(fa()),
  };

  export const map = pipeable.map(Functor);
  export const ap = pipeable.ap(Apply);
  export const chain = pipeable.chain(Chain);

  export const bind = fpChain.bind(Chain);
  export const chainFirst = fpChain.chainFirst(Chain);

  export const sequence = readonlyArray.sequence(Applicative);
  export const { liftF } = Lifting;
  export const bindF = lifting.bindF(Lifting);
  export const chainF = lifting.chainF(Lifting);
  export const chainFirstF = lifting.chainFirstF(Lifting);

  export const { fromIO } = FromIO;
  export const chainFirstIOK = fpFromIO.chainFirstIOK(FromIO, Chain);
  export const chainIOK = fpFromIO.chainIOK(FromIO, Chain);
}
