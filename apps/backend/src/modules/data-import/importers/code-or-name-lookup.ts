import { lowerKey } from './entity-importer';

interface NamedRecord {
  id: string;
  name: string;
}

/** Looks a record up by code first, then by exact name; a name shared by several records is ambiguous. */
export class CodeOrNameLookup<Item extends NamedRecord> {
  private readonly byCode: Map<string, Item>;
  private readonly byName = new Map<string, Item[]>();

  constructor(items: Item[], code: (item: Item) => string) {
    this.byCode = new Map(items.map((item) => [lowerKey(code(item)), item]));
    for (const item of items) this.byName.set(lowerKey(item.name), [...(this.byName.get(lowerKey(item.name)) ?? []), item]);
  }

  find(value: string): Item | 'ambiguous' | undefined {
    const byCode = this.byCode.get(lowerKey(value));
    if (byCode) return byCode;
    const named = this.byName.get(lowerKey(value)) ?? [];
    return named.length > 1 ? 'ambiguous' : named[0];
  }
}
