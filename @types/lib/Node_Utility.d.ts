export declare class CNodeRef {
  node: Node;
  constructor(node?: Node | null);
  as<T extends abstract new (...args: any) => any>(constructor_ref: T): InstanceType<T>;
  is<T extends abstract new (...args: any) => any>(constructor_ref: T): boolean;
  passAs<T extends abstract new (...args: any) => any>(constructor_ref: T, fn: (reference: InstanceType<T>) => void): void;
  tryAs<T extends abstract new (...args: any) => any>(constructor_ref: T): InstanceType<T> | undefined;
  get classList(): DOMTokenList;
  get className(): string;
  get style(): CSSStyleDeclaration;
  getAttribute(qualifiedName: string): string | null;
  setAttribute(qualifiedName: string, value: string): void;
  getStyleProperty(property: string): string;
  setStyleProperty(property: string, value: string | null, priority?: string): void;
}
export declare function NodeRef(node?: Node | null): CNodeRef;
export declare class CNodeListRef extends Array<CNodeRef> {
  constructor(nodes?: NodeList | Node[] | null);
  as<T extends abstract new (...args: any) => any>(constructor_ref: T): Array<InstanceType<T>>;
  passEachAs<T extends abstract new (...args: any) => any>(constructor_ref: T, fn: (reference: InstanceType<T>) => void): void;
}
export declare function NodeListRef(nodes?: NodeList | Node[] | null): CNodeListRef;
export declare function SelectElements(...selectors: string[]): CNodeListRef;
