import type { ProcessRef, Ritual, ScopeRef } from "#/contracts";
import { Domain } from "./domain";
import type { Failure } from "#/failures";
import type { Option } from "#/utils";
import type { Reaper } from "#/executor/autonomy";
import type { ScopeState } from "#/interpreter";
import { readonlySet } from "fp-ts";

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
    if (state.status === "closing") {
      this.#closingScopes.add(scope);
    } else if (!readonlySet.isEmpty(this.#closingScopes)) {
      this.#closingScopes.delete(scope);
    }
  }

  public *createTasks(
    scopeState: (scope: ScopeRef<unknown>) => ScopeState,
    spawn: (
      scope: ScopeRef<unknown>,
      worker: Ritual<Option<Failure>>,
    ) => ProcessRef<Option<Failure>>,
  ): Iterable<ReaperTask> {
    for (const scope of this.#leafScopes) {
      if (scopeState(scope).status === "closing") {
        yield {
          adjudicate: () => spawn(this.#scopeRoot, () => this.#reaper.adjudicate(scope)),
          scope,
        };
      }
    }
  }

  public override close() {
    this.#closingScopes.clear();
    this.#leafScopes.clear();
    super.close();
  }

  public get hasClosingScope(): boolean {
    return !readonlySet.isEmpty(this.#closingScopes);
  }

  public get scopeRoot(): ScopeRef<unknown> {
    return this.#scopeRoot;
  }

  private constructor(parent: ReaperDomain, reaper: Reaper) {
    super(parent);
    this.#reaper = reaper;
  }

  #scopeRoot!: ScopeRef<unknown>;
  readonly #closingScopes = new Set<ScopeRef<unknown>>();
  readonly #leafScopes = new Set<ScopeRef<unknown>>();
  readonly #reaper: Reaper;
}

export interface ReaperTask {
  adjudicate(): ProcessRef<Option<Failure>>;
  scope: ScopeRef<unknown>;
}
