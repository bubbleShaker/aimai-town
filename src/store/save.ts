import type { World } from '../scenario/types';
import type { GameState } from '../engine/state';
import { restoreState } from '../engine/restore';
import { asRecord } from '../engine/parse';
import { readJson, remove, writeJson } from './storage';

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
  writeJson(KEY, { version: VERSION, state });
}

/** 前の歩みを読み戻す。無い・壊れている・形が古いときは null（初めから始める） */
export function loadState(world: World): GameState | null {
  const saved = asRecord(readJson(KEY));
  if (!saved || saved.version !== VERSION) return null;
  return restoreState(world, saved.state);
}

/** 置いてきたものごと消す。始め直しに使う */
export function clearSave(): void {
  remove(KEY);
}
