// oxlint-disable id-length
import type { applicative, apply, either, functor, monad, pointed } from "fp-ts";
import { eitherT, chain as fpChain, fromIO as fpFromIO, readonlyArray } from "fp-ts";
import type { Plan } from "#src/contracts/plan.js";
import type { Syscall } from "#src/contracts/syscall.js";
import { flow } from "fp-ts/function";
import { lifting } from "./lifting";
import { plan } from "./plan";
import type { syscall } from "./syscall";

declare module "fp-ts/HKT" {
  interface URItoKind2<E, A> {
    readonly [planEither.URI]: planEither.PlanEither<E, A>;
  }
}

export namespace planEither {
  export const URI = "PlanEither";
  export type URI = typeof URI;

  export type PlanEither<E, A> = Plan<either.Either<E, A>>;

  export const left = eitherT.left(plan.Pointed);
  export const right = eitherT.right(plan.Pointed);

  export const map = eitherT.map(plan.Functor);
  export const ap = eitherT.ap(plan.Apply);
  export const chain = eitherT.chain(plan.Monad);

  export const leftPlan = eitherT.leftF(plan.Functor);
  export const rightPlan = eitherT.rightF(plan.Functor);

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

  export const Lifting: lifting.Lifting2<URI, syscall.URI, Syscall> = {
    URI,
    ap: Apply.ap,
    chain: Chain.chain,
    liftF: flow(plan.liftF, rightPlan),
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

  export const alt = eitherT.alt(plan.Monad);
  export const bimap = eitherT.bimap(plan.Monad);
  export const chainNullableK = eitherT.chainNullableK(plan.Monad);
  export const fromNullable = eitherT.fromNullable(plan.Pointed);
  export const getOrElse = eitherT.getOrElse(plan.Monad);
  export const mapLeft = eitherT.mapLeft(plan.Functor);
  export const match = eitherT.match(plan.Chain);
  export const matchE = eitherT.matchE(plan.Chain);
  export const orElse = eitherT.orElse(plan.Monad);
  export const orElseFirst = eitherT.orElseFirst(plan.Monad);
  export const orLeft = eitherT.orLeft(plan.Monad);
  export const swap = eitherT.swap(plan.Functor);
  export const toUnion = eitherT.toUnion(plan.Functor);
}
