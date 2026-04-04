// oxlint-disable sort-imports
import type { ScopeRef } from "#/contracts";
import type { ScopeState } from "#/interpreter";
import type { Reaper } from "#/executor/autonomy";
import { Domain } from "./domain";

export class ReaperDomain extends Domain<ReaperDomain> {
  public static root(reaper: Reaper): ReaperDomain {
    return new ReaperDomain(ReaperDomain.sentinel(), reaper);
  }

  public nest(reaper: Reaper): ReaperDomain {
    const child = new ReaperDomain(this, reaper);
    super.addChild(child);
    return child;
  }

  public trackScope(scope: ScopeRef<unknown>, state: ScopeState): void {
    if (!this.#scope) {
      this.#scope = scope;
    }

    if (this.#scope === scope && state.status === "closed") {
      this.close();
    }
  }

  public get reaper(): Reaper {
    return this.#reaper;
  }

  public *frontiers(
    rootScope: ScopeRef<unknown>,
    scopeState: (scope: ScopeRef<unknown>) => ScopeState,
    resolveDomain: (scope: ScopeRef<unknown>) => ReaperDomain,
  ): Iterable<ScopeRef<unknown>> {
    for (const child of this.children) {
      yield* child.frontiers(rootScope, scopeState, resolveDomain);
    }

    const scope = this.isRoot ? rootScope : this.#scope;
    if (!scope) {
      return;
    }

    yield* this.#frontiersOf(scope, scopeState, resolveDomain);
  }

  public isFrontier(
    candidate: ScopeRef<unknown>,
    rootScope: ScopeRef<unknown>,
    scopeState: (scope: ScopeRef<unknown>) => ScopeState,
    resolveDomain: (scope: ScopeRef<unknown>) => ReaperDomain,
  ): boolean {
    const scope = this.isRoot ? rootScope : this.#scope;
    if (!scope) {
      return false;
    }

    for (const frontier of this.#frontiersOf(scope, scopeState, resolveDomain)) {
      if (frontier === candidate) {
        return true;
      }
    }

    return false;
  }

  private constructor(parent: ReaperDomain, reaper: Reaper) {
    super(parent);
    this.#reaper = reaper;
  }

  *#frontiersOf(
    scope: ScopeRef<unknown>,
    scopeState: (scope: ScopeRef<unknown>) => ScopeState,
    resolveDomain: (scope: ScopeRef<unknown>) => ReaperDomain,
  ): Iterable<ScopeRef<unknown>> {
    const state = scopeState(scope);
    let hasChildFrontier = false;

    for (const child of state.children) {
      if (resolveDomain(child) !== this) {
        continue;
      }

      for (const frontier of this.#frontiersOf(child, scopeState, resolveDomain)) {
        hasChildFrontier = true;
        yield frontier;
      }
    }

    if (!hasChildFrontier && state.status === "closing") {
      yield scope;
    }
  }

  readonly #reaper: Reaper;
  #scope: ScopeRef<unknown> | null = null;
}
