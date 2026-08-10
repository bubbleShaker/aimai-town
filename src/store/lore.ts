import type { Lore } from '../engine/lore';
import { emptyLore, restoreLore } from '../engine/lore';
import { asRecord } from '../engine/parse';
import { readJson, writeJson } from './storage';

/**
 * 一度読んだ言葉の記録を残す層。
 *
 * 歩みの保存（save）とは別の鍵に書く。始め直しは save を消すので、
 * 同じ鍵に相乗りさせると、始め直した瞬間に既読が消えて周回を越えられない。
 *
 * 消す口は用意しない。始め直しても残るのがこの記録の役目だから。
 */

const KEY = 'aimai-town/lore';

/** 記録の形の番号。Lore の形を変えたら上げる。番号が違うものは読まずに捨てる */
const VERSION = 1;

export function saveLore(lore: Lore): void {
  writeJson(KEY, { version: VERSION, lore });
}

/**
 * 読んだ言葉の記録を読み戻す。無い・壊れている・形が古いときはまっさら。
 * 歩みの読み戻しと違って null を返さないのは、記録が無いことが
 * 「すべて未読」という当たり前の状態でしかないため。
 */
export function loadLore(): Lore {
  const saved = asRecord(readJson(KEY));
  if (!saved || saved.version !== VERSION) return emptyLore();
  return restoreLore(saved.lore);
}
