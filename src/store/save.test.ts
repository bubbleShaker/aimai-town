import { afterEach, describe, expect, it, vi } from 'vitest';
import { world } from '../scenario';
import { createInitialState, reduce } from '../engine/state';
import { clearSave, loadState, saveState } from './save';

/** localStorage の代わり。どの操作で投げるかを差し込めるようにしてある */
function fakeStorage(throwsOn: ('get' | 'set' | 'remove')[] = []): Storage {
  const map = new Map<string, string>();
  const guard = (op: 'get' | 'set' | 'remove') => {
    if (throwsOn.includes(op)) throw new Error(`${op} は使えない`);
  };
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    getItem: (k: string) => {
      guard('get');
      return map.get(k) ?? null;
    },
    setItem: (k: string, v: string) => {
      guard('set');
      map.set(k, v);
    },
    removeItem: (k: string) => {
      guard('remove');
      map.delete(k);
    },
  } as Storage;
}

function use(storage: Storage | undefined): void {
  vi.stubGlobal('localStorage', storage);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('saveState / loadState', () => {
  it('保存した歩みを読み戻せる', () => {
    use(fakeStorage());
    const state = reduce(createInitialState(world), { type: 'MOVE', to: 'loom' }, world);
    saveState(state);
    expect(loadState(world)).toEqual(state);
  });

  it('何も保存していなければ null（初めから始める）', () => {
    use(fakeStorage());
    expect(loadState(world)).toBeNull();
  });

  it('始め直すと、保存も消える', () => {
    use(fakeStorage());
    saveState(reduce(createInitialState(world), { type: 'MOVE', to: 'loom' }, world));
    clearSave();
    expect(loadState(world)).toBeNull();
  });

  it('JSON として壊れているものは読まない', () => {
    const storage = fakeStorage();
    use(storage);
    storage.setItem('aimai-town/save', '{壊れている');
    expect(loadState(world)).toBeNull();
  });

  it('形の番号が違う保存は読まない（古い形を新しい形として読まない）', () => {
    const storage = fakeStorage();
    use(storage);
    storage.setItem(
      'aimai-town/save',
      JSON.stringify({ version: 0, state: createInitialState(world) }),
    );
    expect(loadState(world)).toBeNull();
  });

  it('中身が壊れている保存は読まない（検めは engine に任せる）', () => {
    const storage = fakeStorage();
    use(storage);
    storage.setItem(
      'aimai-town/save',
      JSON.stringify({ version: 1, state: { currentPlaceId: 'nowhere' } }),
    );
    expect(loadState(world)).toBeNull();
  });
});

describe('localStorage が使えない環境', () => {
  it('保存できなくても落ちない', () => {
    use(undefined);
    expect(() => saveState(createInitialState(world))).not.toThrow();
    expect(() => clearSave()).not.toThrow();
    expect(loadState(world)).toBeNull();
  });

  it('書き込みが投げても落ちない（保存量の上限やプライベートモード）', () => {
    use(fakeStorage(['set']));
    expect(() => saveState(createInitialState(world))).not.toThrow();
  });

  it('読み出しが投げても、初めから始められる', () => {
    use(fakeStorage(['get']));
    expect(loadState(world)).toBeNull();
  });

  it('消せなくても落ちない（始め直しが止まらない）', () => {
    use(fakeStorage(['remove']));
    expect(() => clearSave()).not.toThrow();
  });
});
