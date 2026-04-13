import type { AbstractClass, ConditionalExcept } from "type-fest";

export abstract class Domain<DerivedDomain extends Domain<DerivedDomain>> {
  public static *domains<Instance extends Domain<Instance>>(
    this: DomainClass<Instance>,
    root: Instance,
  ): Iterable<Instance> {
    yield root;

    for (const child of root.#children) {
      yield* this.domains(child);
    }
  }

  protected static sentinel<Instance extends Domain<Instance>>(
    this: DomainClass<Instance>,
  ): Instance {
    return Domain.#sentinel as Instance;
  }

  protected constructor(private readonly parent: DerivedDomain) {}

  public close(): void {
    this.parent.removeChild(this as unknown as DerivedDomain);
  }

  protected addChild(child: DerivedDomain): void {
    this.#children.add(child);
  }

  protected removeChild(child: DerivedDomain): void {
    this.#children.delete(child);
  }

  protected get isRoot(): boolean {
    return this.parent === Domain.#sentinel;
  }

  // oxlint-disable-next-line no-explicit-any
  static readonly #sentinel = null as unknown as Domain<any>;

  readonly #children = new Set<DerivedDomain>();
}

export type DomainClass<DerivedDomain extends Domain<DerivedDomain>> = ConditionalExcept<
  typeof Domain<DerivedDomain>,
  AbstractClass<typeof Domain<DerivedDomain>>
>;
