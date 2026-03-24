// oxlint-disable id-length
import type { SigilShape, Wisp } from "#/contracts";
import type { applicative, apply, functor, monad, pointed } from "fp-ts";
import { evoke, restingWisp, stirringWisp } from "#/contracts";
import { chain as fpChain, fromIO as fpFromIO, pipeable, readonlyArray } from "fp-ts";
import { lifting } from "./lifting";
import type { sigil } from "./sigil";

declare module "fp-ts/HKT" {
  interface URItoKind<A> {
    readonly [wisp.URI]: Wisp<A>;
  }
}

export namespace wisp {
  export const URI = "Wisp";
  export type URI = typeof URI;

  export const Pointed: pointed.Pointed1<URI> = {
    URI,
    of: restingWisp,
  };

  export const Functor: functor.Functor1<URI> = {
    URI,
    map: (fa, f) =>
      fa.bearing === "resting"
        ? restingWisp(f(fa.relic))
        : stirringWisp(fa.sigil, (x) => Functor.map(fa.resonate(x), f)),
  };

  export const Apply: apply.Apply1<URI> = {
    URI,
    ap: (fab, fa) =>
      fab.bearing === "resting"
        ? Functor.map(fa, fab.relic)
        : stirringWisp(fab.sigil, (x) => Apply.ap(fab.resonate(x), fa)),
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
        : stirringWisp(fa.sigil, (x) => Chain.chain(fa.resonate(x), f)),
    map: Functor.map,
  };

  export const Monad: monad.Monad1<URI> = {
    URI,
    ap: Apply.ap,
    chain: Chain.chain,
    map: Functor.map,
    of: Pointed.of,
  };

  export const Do = restingWisp(null);

  export const Lifting: lifting.Lifting<URI, sigil.URI, SigilShape> = {
    URI,
    ap: Apply.ap,
    chain: Chain.chain,
    liftF: evoke as any,
    map: Functor.map,
  };

  export const FromIO: fpFromIO.FromIO1<URI> = {
    URI,
    fromIO: (fa) => Pointed.of(fa()),
  };

  export const { of } = Pointed;

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
