// oxlint-disable id-length
import type { Plan, Syscall } from "#src/contracts";
import type { applicative, apply, functor, monad, pointed } from "fp-ts";
import { chain as fpChain, fromIO as fpFromIO, pipeable, readonlyArray } from "fp-ts";
import { impurePlan, purePlan } from "#src/contracts";
import { lifting } from "./lifting";
import type { syscall } from "./syscall";

declare module "fp-ts/HKT" {
  interface URItoKind<A> {
    readonly [plan.URI]: Plan<A>;
  }
}

export namespace plan {
  export const URI = "Plan";
  export type URI = typeof URI;

  export const pure = purePlan;
  export const impure = impurePlan;

  export const Pointed: pointed.Pointed1<URI> = {
    URI,
    of: pure,
  };

  export const Functor: functor.Functor1<URI> = {
    URI,
    map: (fa, f) =>
      fa.kind === "pure"
        ? pure(f(fa.value))
        : impure(fa.syscall, (x) => Functor.map(fa.then(x), f), fa.terminate),
  };

  export const Apply: apply.Apply1<URI> = {
    URI,
    ap: (fab, fa) =>
      fab.kind === "pure"
        ? Functor.map(fa, fab.value)
        : impure(fab.syscall, (x) => Apply.ap(fab.then(x), fa), fab.terminate),
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
      fa.kind === "pure"
        ? f(fa.value)
        : impure(fa.syscall, (x) => Chain.chain(fa.then(x), f), fa.terminate),
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

  export const Lifting: lifting.Lifting<URI, syscall.URI, Syscall> = {
    URI,
    ap: Apply.ap,
    chain: Chain.chain,
    liftF: (fa) => impure(fa, pure, () => Do),
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
