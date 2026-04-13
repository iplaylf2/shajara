// oxlint-disable id-length
import type { SigilShape, Wisp } from "#/contracts";
import type { applicative, apply, either, functor, monad, pointed } from "fp-ts";
import { eitherT, chain as fpChain, fromIO as fpFromIO, readonlyArray } from "fp-ts";
import { flow } from "fp-ts/function";
import { lifting } from "./lifting";
import type { sigil } from "./sigil";
import { wisp } from "./wisp";

declare module "fp-ts/HKT" {
  interface URItoKind2<E, A> {
    readonly [wispEither.URI]: wispEither.WispEither<E, A>;
  }
}

// oxlint-disable-next-line no-namespace
export namespace wispEither {
  export const URI = "WispEither";
  export type URI = typeof URI;

  export type WispEither<E, A> = Wisp<either.Either<E, A>>;

  export const left = eitherT.left(wisp.Pointed);
  export const right = eitherT.right(wisp.Pointed);

  export const map = eitherT.map(wisp.Functor);
  export const ap = eitherT.ap(wisp.Apply);
  export const chain = eitherT.chain(wisp.Monad);

  export const leftWisp = eitherT.leftF(wisp.Functor);
  export const rightWisp = eitherT.rightF(wisp.Functor);

  export const Pointed: pointed.Pointed2<URI> = {
    URI,
    of: right,
  };

  export const Functor: functor.Functor2<URI> = {
    URI,
    map: (fa, f) => map(f)(fa),
  };

  export const Apply: apply.Apply2<URI> = {
    URI,
    ap: (fab, fa) => ap(fa)(fab),
    map: Functor.map,
  };

  export const Applicative: applicative.Applicative2<URI> = {
    URI,
    ap: Apply.ap,
    map: Functor.map,
    of: Pointed.of,
  };

  export const Chain: fpChain.Chain2<URI> = {
    URI,
    ap: Apply.ap,
    chain: (fa, f) => chain(f)(fa),
    map: Functor.map,
  };

  export const Monad: monad.Monad2<URI> = {
    URI,
    ap: Apply.ap,
    chain: Chain.chain,
    map: Functor.map,
    of: Pointed.of,
  };

  export const Lifting: lifting.Lifting2<URI, sigil.URI, SigilShape> = {
    URI,
    ap: Apply.ap,
    chain: Chain.chain,
    liftF: flow(wisp.liftF, rightWisp),
    map: Functor.map,
  };

  export const FromIO: fpFromIO.FromIO2<URI> = {
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

  export const alt = eitherT.alt(wisp.Monad);
  export const bimap = eitherT.bimap(wisp.Monad);
  export const chainNullableK = eitherT.chainNullableK(wisp.Monad);
  export const fromNullable = eitherT.fromNullable(wisp.Pointed);
  export const getOrElse = eitherT.getOrElse(wisp.Monad);
  export const mapLeft = eitherT.mapLeft(wisp.Functor);
  export const match = eitherT.match(wisp.Chain);
  export const matchE = eitherT.matchE(wisp.Chain);
  export const orElse = eitherT.orElse(wisp.Monad);
  export const orElseFirst = eitherT.orElseFirst(wisp.Monad);
  export const orLeft = eitherT.orLeft(wisp.Monad);
  export const swap = eitherT.swap(wisp.Functor);
  export const toUnion = eitherT.toUnion(wisp.Functor);
}
