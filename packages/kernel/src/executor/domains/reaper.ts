// oxlint-disable no-magic-numbers
import type { ProcessRef, Ritual, ScopeRef } from "#/contracts";
import { Domain } from "./domain";
import type { Failure } from "#/failures";
import type { Option } from "#/utils";
import type { Reaper } from "#/executor/autonomy";
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

  public setScopeRoot(scope: ScopeRef<unknown>): void {
    this.#scopeRoot = scope;
    this.addLeafScope(scope);
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

  public *createTasks(
    scopeState: (scope: ScopeRef<unknown>) => ScopeState,
    spawn: (
      scope: ScopeRef<unknown>,
      worker: Ritual<Option<Failure>>,
    ) => ProcessRef<Option<Failure>>,
  ): Iterable<() => ProcessRef<Option<Failure>>> {
    for (const scope of this.#leafScopes) {
      if (scopeState(scope).status === "closing") {
        yield () => spawn(this.#scopeRoot, () => this.#reaper.reap(scope));
      }
    }
  }

  public override close() {
    this.#closingScopes.clear();
    this.#leafScopes.clear();
    super.close();
  }

  public get hasClosingScope(): boolean {
    return this.#closingCount > 0;
  }

  public get scopeRoot(): ScopeRef<unknown> {
    return this.#scopeRoot;
  }

  private constructor(parent: ReaperDomain, reaper: Reaper) {
    super(parent);
    this.#reaper = reaper;
  }

  #scopeRoot!: ScopeRef<unknown>;
  #closingCount = 0;
  readonly #closingScopes = new Set<ScopeRef<unknown>>();
  readonly #leafScopes = new Set<ScopeRef<unknown>>();
  readonly #reaper: Reaper;
}
