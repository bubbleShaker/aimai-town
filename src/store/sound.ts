import { asRecord } from '../engine/parse';
import { readJson, writeJson } from './storage';

/**
 * 音を鳴らすかどうかの記憶。
 *
 * 歩みの保存とも、読んだ言葉の記録とも別の鍵に書く。
 * 歩みに相乗りさせると、始め直した瞬間に音の設定まで戻る。
 * 読んだ言葉の記録に混ぜないのは、あちらが「持ち越すのは一度読んだかだけ」と
 * 決めた入れ物で、そこへ別の意味のものを入れると決めごとが溶けるため。
 *
 * 読み戻しの方針は歩みとも記録とも違い、「読めなければ既定に戻す」。
 * 音の設定は世界の形に依らないので、検めるのは真偽値かどうかだけでよい。
 */

const KEY = 'aimai-town/sound';

/** 記憶の形の番号。形を変えたら上げる。番号が違うものは読まずに捨てる */
const VERSION = 1;

/**
 * 何も記憶が無いときは鳴らす側。
 * ただしこれは「鳴らしてよいか」であって、これだけで音は出ない。
 * 実際に鳴り出すのは最初の触れのあと（ui/useBgm.ts）。
 */
const DEFAULT_ON = true;

export function saveSoundOn(on: boolean): void {
  writeJson(KEY, { version: VERSION, on });
}

/** 無い・壊れている・形が古いときは既定（鳴らす側）に戻す */
export function loadSoundOn(): boolean {
  const saved = asRecord(readJson(KEY));
  if (!saved || saved.version !== VERSION) return DEFAULT_ON;
  return typeof saved.on === 'boolean' ? saved.on : DEFAULT_ON;
}
