// oxlint-disable id-length
import type { applicative, apply, functor, monad, option, pointed } from "fp-ts";
import { chain as fpChain, fromIO as fpFromIO, optionT, readonlyArray } from "fp-ts";
import type { Plan } from "#src/contracts/plan.js";
import type { Syscall } from "#src/contracts/syscall.js";
import { flow } from "fp-ts/lib/function";
import { lifting } from "./lifting";
import { plan } from "./plan";
import type { syscall } from "./syscall";

declare module "fp-ts/HKT" {
  interface URItoKind<A> {
    readonly [planOption.URI]: planOption.PlanOption<A>;
  }
}

export namespace planOption {
  export const URI = "PlanOption";
  export type URI = typeof URI;

  export type PlanOption<A> = Plan<option.Option<A>>;

  export const some = optionT.some(plan.Pointed);

  export const map = optionT.map(plan.Functor);
  export const ap = optionT.ap(plan.Apply);
  export const chain = optionT.chain(plan.Monad);

  export const fromPlan = optionT.fromF(plan.Functor);

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

  export const Lifting: lifting.Lifting<URI, syscall.URI, Syscall> = {
    URI,
    ap: Apply.ap,
    chain: Chain.chain,
    liftF: flow(plan.liftF, fromPlan),
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

  export const alt = optionT.alt(plan.Monad);
  export const chainNullableK = optionT.chainNullableK(plan.Monad);
  export const chainOptionK = optionT.chainOptionK(plan.Monad);
  export const fromEither = optionT.fromEither(plan.Pointed);
  export const fromNullable = optionT.fromNullable(plan.Pointed);
  export const fromPredicate = optionT.fromPredicate(plan.Pointed);
  export const getOrElse = optionT.getOrElse(plan.Monad);
  export const match = optionT.match(plan.Functor);
  export const matchE = optionT.matchE(plan.Chain);
  export const zero = optionT.zero(plan.Pointed);
}
