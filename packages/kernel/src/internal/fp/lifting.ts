// oxlint-disable id-length
import type { Kind, Kind2, URIS, URIS2 } from "fp-ts/HKT";
import { chain, pipeable } from "fp-ts";
import { flow } from "fp-ts/lib/function";

export namespace lifting {
  export interface Lifting<M extends URIS, F extends URIS, C> extends chain.Chain1<M> {
    readonly liftF: <A extends C>(fa: A) => Kind<M, Kind<F, A>>;
  }
  export interface Lifting2<M extends URIS2, F extends URIS, C> extends chain.Chain2<M> {
    readonly liftF: <E, A extends C>(fa: A) => Kind2<M, E, Kind<F, A>>;
  }

  export function chainF<M extends URIS, F extends URIS, C>(
    M: Lifting<M, F, C>,
  ): <A, B extends C>(f: (a: A) => B) => (ma: Kind<M, A>) => Kind<M, Kind<F, B>>;
  export function chainF<M extends URIS2, F extends URIS, C>(
    M: Lifting2<M, F, C>,
  ): <E, A, B extends C>(f: (a: A) => B) => (ma: Kind2<M, E, A>) => Kind2<M, E, Kind<F, B>>;
  export function chainF(M: Lifting<any, any, any>) {
    const chainM = pipeable.chain(M);

    return (f: (a: unknown) => unknown) => chainM(flow(f, M.liftF));
  }

  export function chainFirstF<M extends URIS, _ extends URIS, C>(
    M: Lifting<M, _, C>,
  ): <A, _ extends C>(f: (a: A) => _) => (ma: Kind<M, A>) => Kind<M, A>;
  export function chainFirstF<M extends URIS2, _ extends URIS, C>(
    M: Lifting2<M, _, C>,
  ): <E, A, _ extends C>(f: (a: A) => _) => (ma: Kind2<M, E, A>) => Kind2<M, E, A>;
  export function chainFirstF(M: Lifting<any, any, any>) {
    const chainFirst = chain.chainFirst(M);

    return (f: (a: unknown) => unknown) => chainFirst(flow(f, M.liftF));
  }

  export function bindF<M extends URIS, F extends URIS, C>(
    M: Lifting<M, F, C>,
  ): <N extends string, A, B extends C>(
    name: Exclude<N, keyof A>,
    f: (a: A) => B,
  ) => (
    ma: Kind<M, A>,
  ) => Kind<M, { readonly [K in N | keyof A]: K extends keyof A ? A[K] : Kind<F, B> }>;
  export function bindF<M extends URIS2, F extends URIS, C>(
    M: Lifting2<M, F, C>,
  ): <N extends string, E, A, B extends C>(
    name: Exclude<N, keyof A>,
    f: (a: A) => B,
  ) => (
    ma: Kind2<M, E, A>,
  ) => Kind2<M, E, { readonly [K in N | keyof A]: K extends keyof A ? A[K] : Kind<F, B> }>;
  export function bindF(M: Lifting<any, any, any>) {
    const bind = chain.bind(M);

    return (name: string, f: (a: unknown) => unknown) => bind(name, flow(f, M.liftF));
  }
}
