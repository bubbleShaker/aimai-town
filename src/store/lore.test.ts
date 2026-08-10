import { afterEach, describe, expect, it, vi } from 'vitest';
import { emptyLore, markRead } from '../engine/lore';
import { createInitialState, reduce } from '../engine/state';
import { world } from '../scenario';
import { fakeStorage } from './fakeStorage';
import { loadLore, saveLore } from './lore';
import { clearSave, saveState } from './save';

function use(storage: Storage | undefined): void {
  vi.stubGlobal('localStorage', storage);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('saveLore / loadLore', () => {
  it('読んだ記録を書いて読み戻せる', () => {
    use(fakeStorage());
    const lore = markRead(emptyLore(), { kind: 'talk', talkId: 't-keeper' });
    saveLore(lore);
    expect(loadLore()).toEqual(lore);
  });

  it('何も読んでいなければ、まっさら', () => {
    use(fakeStorage());
    expect(loadLore()).toEqual(emptyLore());
  });

  it('JSON として壊れているものは、まっさらとして扱う', () => {
    const storage = fakeStorage();
    use(storage);
    storage.setItem('aimai-town/lore', '{壊れている');
    expect(loadLore()).toEqual(emptyLore());
  });

  it('形の番号が違う記録は読まない', () => {
    const storage = fakeStorage();
    use(storage);
    storage.setItem(
      'aimai-town/lore',
      JSON.stringify({ version: 0, lore: { readIds: ['talk:t-keeper'] } }),
    );
    expect(loadLore()).toEqual(emptyLore());
  });
});

describe('歩みの保存とのかかわり', () => {
  it('始め直して歩みを消しても、読んだ記録は残る', () => {
    // 周回を越えるための記録なので、始め直しで一緒に流れてはいけない
    use(fakeStorage());
    const lore = markRead(emptyLore(), { kind: 'arrival', placeId: world.start });
    saveLore(lore);
    saveState(reduce(createInitialState(world), { type: 'MOVE', to: 'loom' }, world));

    clearSave();

    expect(loadLore()).toEqual(lore);
  });

  it('別の鍵に書く（歩みの保存を上書きしない）', () => {
    const storage = fakeStorage();
    use(storage);
    saveState(createInitialState(world));
    saveLore(markRead(emptyLore(), { kind: 'talk', talkId: 't-keeper' }));
    expect(storage.getItem('aimai-town/save')).not.toBeNull();
    expect(storage.getItem('aimai-town/lore')).not.toBeNull();
  });
});

describe('localStorage が使えない環境', () => {
  it('書けなくても落ちず、まっさらとして読める', () => {
    use(undefined);
    expect(() => saveLore(emptyLore())).not.toThrow();
    expect(loadLore()).toEqual(emptyLore());
  });

  it('書き込みが投げても落ちない', () => {
    use(fakeStorage(['set']));
    expect(() => saveLore(markRead(emptyLore(), { kind: 'gate', gateId: 'g-work' }))).not.toThrow();
  });

  it('読み出しが投げても、まっさらとして始められる', () => {
    use(fakeStorage(['get']));
    expect(loadLore()).toEqual(emptyLore());
  });
});
