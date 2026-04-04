export abstract class Domain<DerivedDomain extends Domain<DerivedDomain>> {
  protected static sentinel<This extends { prototype: unknown }>(this: This): This["prototype"] {
    return Domain.#sentinel;
  }

  protected constructor(parent: DerivedDomain) {
    this.parent = parent;
  }

  protected attachChild(child: DerivedDomain): void {
    this.children.add(child);
  }

  protected get isRoot(): boolean {
    return this.parent === Domain.#sentinel;
  }

  static readonly #sentinel = null as unknown as Domain<any>;

  protected readonly parent: DerivedDomain;
  protected readonly children = new Set<DerivedDomain>();
}
