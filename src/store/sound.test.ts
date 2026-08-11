import { afterEach, describe, expect, it, vi } from 'vitest';
import { emptyLore, markRead } from '../engine/lore';
import { createInitialState } from '../engine/state';
import { world } from '../scenario';
import { fakeStorage } from '../testing/fakeStorage';
import { loadLore, saveLore } from './lore';
import { clearSave, saveState } from './save';
import { loadSoundOn, saveSoundOn } from './sound';

function use(storage: Storage | undefined): void {
  vi.stubGlobal('localStorage', storage);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('saveSoundOn / loadSoundOn', () => {
  it('止めたことを覚えて読み戻せる', () => {
    use(fakeStorage());
    saveSoundOn(false);
    expect(loadSoundOn()).toBe(false);
  });

  it('何も記憶が無ければ鳴らす側', () => {
    use(fakeStorage());
    expect(loadSoundOn()).toBe(true);
  });

  it('JSON として壊れているものは、既定に戻す', () => {
    const storage = fakeStorage();
    use(storage);
    storage.setItem('aimai-town/sound', '{壊れている');
    expect(loadSoundOn()).toBe(true);
  });

  it('形の番号が違う記憶は読まない', () => {
    const storage = fakeStorage();
    use(storage);
    storage.setItem('aimai-town/sound', JSON.stringify({ version: 0, on: false }));
    expect(loadSoundOn()).toBe(true);
  });

  it('真偽値でないものは、既定に戻す', () => {
    // 手で書き換われば何でも入る。ここを通すと、音を出すかの判断が
    // 真偽値でない値に引きずられる
    const storage = fakeStorage();
    use(storage);
    storage.setItem('aimai-town/sound', JSON.stringify({ version: 1, on: 'no' }));
    expect(loadSoundOn()).toBe(true);
  });
});

describe('ほかの記録とのかかわり', () => {
  it('始め直して歩みを消しても、音の設定は残る', () => {
    // 止めた人が、始め直した拍子にまた鳴らされることのないように
    use(fakeStorage());
    saveSoundOn(false);
    saveState(createInitialState(world));

    clearSave();

    expect(loadSoundOn()).toBe(false);
  });

  it('三つとも別の鍵に書く（互いを上書きしない）', () => {
    const storage = fakeStorage();
    use(storage);
    saveState(createInitialState(world));
    saveLore(markRead(emptyLore(), { kind: 'talk', talkId: 't-keeper' }));
    saveSoundOn(false);

    expect(storage.getItem('aimai-town/save')).not.toBeNull();
    expect(storage.getItem('aimai-town/lore')).not.toBeNull();
    expect(storage.getItem('aimai-town/sound')).not.toBeNull();
    // 読み戻しても、互いに欠けていない
    expect(loadSoundOn()).toBe(false);
    expect(loadLore().readIds).toContain('talk:t-keeper');
  });
});

describe('localStorage が使えない環境', () => {
  it('書けなくても落ちず、既定として読める', () => {
    use(undefined);
    expect(() => saveSoundOn(false)).not.toThrow();
    expect(loadSoundOn()).toBe(true);
  });

  it('書き込みが投げても落ちない', () => {
    use(fakeStorage(['set']));
    expect(() => saveSoundOn(false)).not.toThrow();
  });

  it('読み出しが投げても、既定で始められる', () => {
    use(fakeStorage(['get']));
    expect(loadSoundOn()).toBe(true);
  });
});
