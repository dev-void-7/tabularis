let _table: string | null = null;

export const dragState = {
  get table() { return _table; },
  start(name: string) { _table = name; },
  clear() { _table = null; },
};
