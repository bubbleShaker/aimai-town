import type { World } from '../scenario/types';
import type { GameState } from '../engine/state';
import { restoreState } from '../engine/restore';
import { asRecord } from '../engine/parse';
import { readJson, removeKey, writeJson } from './storage';

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

/**
 * 前の歩みを読み戻す。無い・壊れている・形が古いときは null（初めから始める）。
 *
 * 版番号を検める形は store/lore と同じだが、共通の口には畳んでいない。理由は二つ。
 *
 * 畳めない。中身を入れる名（`state` / `lore`）が鍵ごとに違い、すでに公開して人が遊んだ
 * 保存がその名で書かれている。名を揃えると、その保存が読めなくなって歩みが消える。
 *
 * 畳まなくてよい。二つの読み戻しは方針が違う。こちらは読めなければ null（初めから）、
 * lore は読めなければまっさら（すべて未読）で、世界を要るか要らないかも違う。
 * 共通なのは版番号を照らす三行だけで、方針の違う二つを一本の口に通すほうが読みにくい。
 */
export function loadState(world: World): GameState | null {
  const saved = asRecord(readJson(KEY));
  if (!saved || saved.version !== VERSION) return null;
  return restoreState(world, saved.state);
}

/** 置いてきたものごと消す。始め直しに使う（読んだ言葉の記録は消さない。store/lore を参照） */
export function clearSave(): void {
  removeKey(KEY);
}
