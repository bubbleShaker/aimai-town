import type { EndingId, FragmentId, GateId, PlaceId, TalkId } from '../scenario/types';
import { asRecord } from './parse';

/**
 * 一度読んだ言葉の記録。
 *
 * GameState とは別に持つ。始め直すと GameState は流されるが、これは残る。
 * 二周目の人に同じ言葉を一字ずつ送り直さないためだけにあり、
 * 集めた断片も、戸に置いた選択も、ここには入れない
 * （持ち越すものを増やすと、この町が「集めきるもの」に変わる）。
 *
 * これが欠けても失うのは待ち時間だけなので、読めなければまっさらとして扱う。
 */
export interface Lore {
  /** 読み終えた読み物。読んだ順を保つ */
  readIds: ReadingId[];
}

/**
 * 読み物ひとつを指すもの。
 * 場所と対話が同じ id を持っても混ざらないよう、種類ごとに分けて持つ。
 *
 * 文字列ではなく分岐する型にしてあるのは、読み物の種類が増えたとき
 * readingId の switch が never で落ちて気づけるようにするため。
 * また、場所の id を対話の id として渡す取り違えも型で消える。
 */
export type Reading =
  | { kind: 'arrival'; placeId: PlaceId }
  | { kind: 'talk'; talkId: TalkId }
  | { kind: 'gate'; gateId: GateId }
  | { kind: 'reply'; gateId: GateId; fragmentId: FragmentId }
  | { kind: 'ending'; endingId: EndingId };

/** 保存に載る形の名前。localStorage に書くときだけこの姿になる */
export type ReadingId = string;

/**
 * 名を継ぐときの区切り。
 * 世界の id にこの字が混じると `reply:a:b:c` の読みが割れるので、
 * 混じっていないことを lore.test.ts で縛っている。
 */
const SEPARATOR = ':';

/**
 * 覚えておく上限。
 * 町の読み物は数十しかないので普段は届かない。書き換えられた保存が
 * 際限なく膨らんで localStorage を埋めるのを防ぐためだけに置く。
 */
export const READING_LIMIT = 500;

export function emptyLore(): Lore {
  return { readIds: [] };
}

/** 保存に載せる名に畳む */
export function readingId(reading: Reading): ReadingId {
  switch (reading.kind) {
    case 'arrival':
      return join('arrival', reading.placeId);
    case 'talk':
      return join('talk', reading.talkId);
    case 'gate':
      return join('gate', reading.gateId);
    case 'reply':
      return join('reply', reading.gateId, reading.fragmentId);
    case 'ending':
      return join('ending', reading.endingId);
    default: {
      // Reading に枝を足したとき、ここで型エラーになって気づける
      const exhaustive: never = reading;
      throw new Error(`未処理の読み物: ${JSON.stringify(exhaustive)}`);
    }
  }
}

export function hasRead(lore: Lore, reading: Reading): boolean {
  return lore.readIds.includes(readingId(reading));
}

/**
 * 読み終えたことを覚える。すでに覚えていれば元のものをそのまま返す
 * （参照が変わらないので、無駄な書き戻しも再描画も起きない）。
 */
export function markRead(lore: Lore, reading: Reading): Lore {
  const id = readingId(reading);
  if (lore.readIds.includes(id)) return lore;
  return { readIds: trim([...lore.readIds, id]) };
}

/**
 * 保存されたものを Lore に読み戻す。
 *
 * 世界に無い id が混じっていても捨てない。引かれないだけで害が無く、
 * 世界の言葉を書き換える前に読んだ記録まで流す理由もないため
 * （restore とは向きが違う。あちらは通すとルールが破れるので落とす）。
 *
 * 読めないときは捨てるのではなく、まっさらな記録として返す。
 * 記録が無い＝すべて未読で、それは「一字ずつ送られる」だけのことだから。
 */
export function restoreLore(raw: unknown): Lore {
  const saved = asRecord(raw);
  if (!saved) return emptyLore();
  if (!Array.isArray(saved.readIds)) return emptyLore();

  const readIds: ReadingId[] = [];
  for (const item of saved.readIds) {
    if (typeof item !== 'string' || item === '') continue;
    if (readIds.includes(item)) continue;
    readIds.push(item);
  }
  return { readIds: trim(readIds) };
}

function join(...parts: string[]): ReadingId {
  return parts.join(SEPARATOR);
}

/** あふれたら古いほうから忘れる。近ごろ読んだものほど、また読む見込みが高い */
function trim(readIds: ReadingId[]): ReadingId[] {
  return readIds.length > READING_LIMIT ? readIds.slice(readIds.length - READING_LIMIT) : readIds;
}
