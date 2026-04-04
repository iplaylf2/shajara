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

  public trackScope(scope: ScopeRef<unknown>, state: ScopeState): void {
    const isClosing = state.status === "closing";
    const wasClosing = this.#closingScopes.has(scope);
    if (isClosing === wasClosing) {
      return;
    }

    if (isClosing) {
      this.#closingScopes.add(scope);
      this.#closingCount += 1;
      return;
    }

    this.#closingScopes.delete(scope);
    this.#closingCount -= 1;
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
    if (this.#closingCount === NO_CLOSING_SCOPES) {
      return;
    }

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

  #closingCount = NO_CLOSING_SCOPES;
  readonly #closingScopes = new Set<ScopeRef<unknown>>();
  readonly #leafScopes = new Set<ScopeRef<unknown>>();
  readonly #reaper: Reaper;
}

const NO_CLOSING_SCOPES = 0;
