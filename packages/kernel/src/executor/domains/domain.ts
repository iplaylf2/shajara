import type { AbstractClass, ConditionalExcept } from "type-fest";

export abstract class Domain<DerivedDomain extends Domain<DerivedDomain>> {
  public static *domains<Instance extends Domain<Instance>>(
    this: StaticDomain<Instance>,
    root: Instance,
  ): Iterable<Instance> {
    yield root;

    for (const child of root.#children) {
      yield* this.domains(child);
    }
  }

  protected static sentinel<Instance extends Domain<Instance>>(
    this: StaticDomain<Instance>,
  ): Instance {
    return Domain.#sentinel as Instance;
  }

  protected constructor(parent: DerivedDomain) {
    this.#parent = parent;
  }

  public close(): void {
    this.#parent.removeChild(this as unknown as DerivedDomain);
  }

  protected addChild(child: DerivedDomain): void {
    this.#children.add(child);
  }

  protected removeChild(child: DerivedDomain): void {
    this.#children.delete(child);
  }

  protected get isRoot(): boolean {
    return this.#parent === Domain.#sentinel;
  }

  static readonly #sentinel = null as unknown as Domain<any>;

  readonly #parent: DerivedDomain;
  readonly #children = new Set<DerivedDomain>();
}

export type StaticDomain<DerivedDomain extends Domain<DerivedDomain>> = ConditionalExcept<
  typeof Domain<DerivedDomain>,
  AbstractClass<typeof Domain<DerivedDomain>>
>;
