export abstract class Domain<DerivedDomain extends Domain<DerivedDomain>> {
  protected static sentinel<This extends { prototype: unknown }>(this: This): This["prototype"] {
    return Domain.#sentinel;
  }

  protected constructor(parent: DerivedDomain) {
    this.parent = parent;
  }

  public close(): void {
    this.parent.removeChild(this as unknown as DerivedDomain);
  }

  protected addChild(child: DerivedDomain): void {
    this.children.add(child);
  }

  protected removeChild(child: DerivedDomain): void {
    this.children.delete(child);
  }

  protected get isRoot(): boolean {
    return this.parent === Domain.#sentinel;
  }

  static readonly #sentinel = null as unknown as Domain<any>;

  protected readonly parent: DerivedDomain;
  protected readonly children = new Set<DerivedDomain>();
}
