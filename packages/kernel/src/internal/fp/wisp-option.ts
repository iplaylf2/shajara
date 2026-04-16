// oxlint-disable id-length
import type { SigilShape, Wisp } from "#/contracts";
import type { applicative, apply, functor, monad, option, pointed } from "fp-ts";
import { chain as fpChain, fromIO as fpFromIO, optionT, readonlyArray } from "fp-ts";
import { flow } from "fp-ts/function";
import { lifting } from "./lifting";
import type { sigil } from "./sigil";
import { wisp } from "./wisp";

declare module "fp-ts/HKT" {
  interface URItoKind<A> {
    readonly [wispOption.URI]: wispOption.WispOption<A>;
  }
}

/** @completeSurface */
// oxlint-disable-next-line no-namespace
export namespace wispOption {
  export const URI = "WispOption";
  export type URI = typeof URI;

  export type WispOption<A> = Wisp<option.Option<A>>;

  export const some = optionT.some(wisp.Pointed);

  export const map = optionT.map(wisp.Functor);
  export const ap = optionT.ap(wisp.Apply);
  export const chain = optionT.chain(wisp.Monad);

  export const fromWisp = optionT.fromF(wisp.Functor);

  export const Pointed: pointed.Pointed1<URI> = {
    URI,
    of: some,
  };

  export const Functor: functor.Functor1<URI> = {
    URI,
    map: (fa, f) => map(f)(fa),
  };

  export const Apply: apply.Apply1<URI> = {
    URI,
    ap: (fab, fa) => ap(fa)(fab),
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
    chain: (fa, f) => chain(f)(fa),
    map: Functor.map,
  };

  export const Monad: monad.Monad1<URI> = {
    URI,
    ap: Apply.ap,
    chain: Chain.chain,
    map: Functor.map,
    of: Pointed.of,
  };

  export const Lifting: lifting.Lifting<URI, sigil.URI, SigilShape> = {
    URI,
    ap: Apply.ap,
    chain: Chain.chain,
    liftF: flow(wisp.liftF, fromWisp),
    map: Functor.map,
  };

  export const FromIO: fpFromIO.FromIO1<URI> = {
    URI,
    fromIO: (fa) => Pointed.of(fa()),
  };

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

  export const alt = optionT.alt(wisp.Monad);
  export const chainNullableK = optionT.chainNullableK(wisp.Monad);
  export const chainOptionK = optionT.chainOptionK(wisp.Monad);
  export const fromEither = optionT.fromEither(wisp.Pointed);
  export const fromNullable = optionT.fromNullable(wisp.Pointed);
  export const fromPredicate = optionT.fromPredicate(wisp.Pointed);
  export const getOrElse = optionT.getOrElse(wisp.Monad);
  export const match = optionT.match(wisp.Functor);
  export const matchE = optionT.matchE(wisp.Chain);
  export const zero = optionT.zero(wisp.Pointed);
}
