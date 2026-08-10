import type { ShownLine } from './StoryView';

/**
 * いま送っている一行が「どれ」なのかを決めるもの。
 *
 * 文面だけでは足りない。同じ文が二行続くこともあれば、行番号が同じまま
 * 別の場面へ差し替わることもある。場面の実体・行番号・文面の三つが揃って
 * はじめて一行が一意に決まる。
 */
export interface TypeTarget {
  /** どの場面の言葉か。場面が変われば配列の実体ごと変わる */
  source: readonly ShownLine[];
  /** 何行目か */
  lineNo: number;
  /** その行の文面 */
  text: string;
}

/** ここまで何字送ったかの記録 */
export interface TypeProgress extends TypeTarget {
  sent: number;
}

/**
 * 記録した進み具合が、いま出そうとしている行に当てはまるかを見て、送り済みの字数を返す。
 *
 * 当てはまらなければ 0 から送り直す。ここを「effect が数え直すまで待つ」作りにすると、
 * 行が変わった一瞬だけ前の行の字数が新しい行にあたって全文が出てしまい、
 * その隙に触れると一字も読ませないまま次の場面へ進めてしまう。
 * だから描くその時に照らし合わせる。
 */
export function sentSoFar(
  progress: TypeProgress,
  target: TypeTarget,
  total: number,
  instant: boolean,
): number {
  // 演出を減らす設定の人には送らず、はじめから全文を出す
  if (instant) return total;

  const sameLine =
    progress.source === target.source &&
    progress.lineNo === target.lineNo &&
    progress.text === target.text;
  if (!sameLine) return 0;

  // 記録が文字数を追い越すことは無いはずだが、追い越したまま返すと
  // 「送り終えていないのに全文が出ている」に化ける
  return Math.min(progress.sent, total);
}
