import { Domain } from "./domain";
import type { Reaper } from "#/executor/autonomy";
import type { ScopeRef } from "#/contracts";
import type { ScopeState } from "#/interpreter";

export class ReaperDomain extends Domain<ReaperDomain> {
  public static root(reaper: Reaper): ReaperDomain {
    return new ReaperDomain(ReaperDomain.sentinel(), reaper);
  }

  public nest(reaper: Reaper): ReaperDomain {
    const child = new ReaperDomain(this, reaper);
    super.addChild(child);
    return child;
  }

  public get reaper(): Reaper {
    return this.#reaper;
  }

  public addLeafScope(scope: ScopeRef<unknown>): void {
    this.#leafScopes.add(scope);
  }

  public removeLeafScope(scope: ScopeRef<unknown>): void {
    this.#leafScopes.delete(scope);
  }

  public *domains(): Iterable<ReaperDomain> {
    yield this;

    for (const child of this.children) {
      yield* child.domains();
    }
  }

  public *frontiers(
    scopeState: (scope: ScopeRef<unknown>) => ScopeState,
  ): Iterable<ScopeRef<unknown>> {
    for (const scope of this.#leafScopes) {
      if (scopeState(scope).status === "closing") {
        yield scope;
      }
    }
  }

  public isFrontier(
    scope: ScopeRef<unknown>,
    scopeState: (scope: ScopeRef<unknown>) => ScopeState,
  ): boolean {
    return this.#leafScopes.has(scope) && scopeState(scope).status === "closing";
  }

  private constructor(parent: ReaperDomain, reaper: Reaper) {
    super(parent);
    this.#reaper = reaper;
  }

  readonly #leafScopes = new Set<ScopeRef<unknown>>();
  readonly #reaper: Reaper;
}
