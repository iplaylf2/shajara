import type { Ritual, ScopeRef } from "#/contracts/index.js";
import { Domain } from "./domain.js";
import type { Failure } from "#/failures/index.js";
import type { Option } from "#/utils/index.js";
import type { Reaper } from "#/executor/autonomy.js";
import type { ScopeState } from "#/interpreter/index.js";
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

  public *createAdjudications(
    scopeState: (scope: ScopeRef<unknown>) => ScopeState,
  ): Iterable<ReaperAdjudication> {
    for (const scope of this.#leafScopes) {
      if (scopeState(scope).status === "closing") {
        yield {
          adjudicate: () => this.reaper.adjudicate(scope),
          scope,
        };
      }
    }
  }

  public override close(): void {
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

  private constructor(
    parent: ReaperDomain,
    private readonly reaper: Reaper,
  ) {
    super(parent);
  }

  #scopeRoot!: ScopeRef<unknown>;
  readonly #closingScopes = new Set<ScopeRef<unknown>>();
  readonly #leafScopes = new Set<ScopeRef<unknown>>();
}

export interface ReaperAdjudication {
  adjudicate: Ritual<Option<Failure>>;
  scope: ScopeRef<unknown>;
}
