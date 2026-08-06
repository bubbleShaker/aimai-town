import type { World } from '../scenario/types';
import type { GameState } from '../engine/state';
import { restoreState } from '../engine/restore';

/**
 * 歩みを残しておく層。副作用（localStorage）はここだけに閉じ込める。
 * 読み戻すときの判断は engine/restore に置いてあるので、この層は
 * 「書く・読む・消す」と「壊れていても落ちない」ことだけを引き受ける。
 */

const KEY = 'aimai-town/save';

/**
 * 保存の形の番号。GameState の形を変えたら上げる。
 * 番号が違うものは読まずに捨てる。古い形を新しい形として読むと、
 * 検めをすり抜けた欠けが engine に流れ込むため。
 */
const VERSION = 1;

export function saveState(state: GameState): void {
  const storage = available();
  if (!storage) return;
  try {
    storage.setItem(KEY, JSON.stringify({ version: VERSION, state }));
  } catch {
    // 保存量の上限などで失敗する。書けなくても歩みは続けられるので黙って諦める
  }
}

/** 前の歩みを読み戻す。無い・壊れている・形が古いときは null（初めから始める） */
export function loadState(world: World): GameState | null {
  const storage = available();
  if (!storage) return null;
  let text: string | null;
  try {
    text = storage.getItem(KEY);
  } catch {
    return null;
  }
  if (text === null) return null;

  const saved = parse(text);
  if (!saved || saved.version !== VERSION) return null;
  return restoreState(world, saved.state);
}

/** 置いてきたものごと消す。始め直しに使う */
export function clearSave(): void {
  const storage = available();
  if (!storage) return;
  try {
    storage.removeItem(KEY);
  } catch {
    // 消せなくても遊びは止めない
  }
}

/** JSON として読めなければ null。中身の検めは engine/restore に任せる */
function parse(text: string): { version: unknown; state: unknown } | null {
  try {
    const value: unknown = JSON.parse(text);
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    return { version: record.version, state: record.state };
  } catch {
    return null;
  }
}

/**
 * localStorage は「あるのに使えない」ことがある。
 * プライベートモードや設定で参照そのものが投げるので、触る前に包んで確かめる。
 * 保存が効かないことより、遊べなくなることのほうが悪い。
 */
function available(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}
