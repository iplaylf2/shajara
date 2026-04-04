// oxlint-disable id-length
export abstract class Domain<T extends Domain<T>> {
  protected static sentinel<T extends Domain<any>>(): T {
    return Domain.#sentinel as T;
  }

  protected constructor(parent: T) {
    this.parent = parent;
  }

  protected attachChild(child: T): void {
    this.children.add(child);
  }

  protected get isRoot(): boolean {
    return this.parent === Domain.#sentinel;
  }

  static readonly #sentinel = null as unknown as Domain<any>;

  protected readonly parent: T;
  protected readonly children = new Set<T>();
}
