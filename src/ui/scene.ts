import type { Ending, FragmentId, Gate, TalkId } from '../scenario/types';
import type { Lore, Reading } from '../engine/lore';
import { hasRead } from '../engine/lore';

/**
 * 画面に流す一行。fragment が立っている行は断片の獲得を示す。
 * 描く側（StoryView）ではなくこちらに置くのは、場面がどんな言葉を抱えるかは
 * 場面の側の話で、React から離した層をそのまま保つため。
 */
export interface ShownLine {
  speaker?: string;
  text: string;
  fragment?: boolean;
}

/**
 * 画面の状態。ゲームの進行そのもの（GameState）とは分けて持つ。
 * 「対話の何行目を読んでいるか」はセーブしても意味がない情報なので、engine には置かない。
 * 扉は id ではなく実体で持つ。引き直しに失敗して画面が空になる経路を型で消すため。
 *
 * React から離してあるのは、読みの場面をどう開くかを単体で縛れるようにするため。
 * ここが崩れると「一行も目にしないまま次へ行ける」に落ちるが、それは絵に映らない。
 */
export type Scene =
  | { kind: 'idle' }
  | ReadingScene
  | { kind: 'choosing'; gate: Gate }
  | { kind: 'note' }
  | { kind: 'ending'; ending: Ending }
  | { kind: 'trace' };

export interface ReadingScene {
  kind: 'reading';
  /**
   * いま読んでいるのがどの読み物か。読み切ったときに覚えるために持つ。
   * 場面を組むには必ずこれが要るので、読み物を足したとき
   * 「覚えるのを書き忘れて、二周目でも一字ずつ送られる」が起きない。
   */
  reading: Reading;
  lines: ShownLine[];
  /** どこまで開いたか */
  shown: number;
  /**
   * 一字ずつ送らず、はじめから出し切るか。
   * どこまで開くかと同じ拍で決める。別々に決めると、
   * 「一行目しか開いていないのに、その一行が一息で出る」組み合わせを作れてしまう。
   */
  instant: boolean;
  then: AfterReading;
}

/**
 * 読み終えたときに何が起きるか。
 * 手続きではなくデータとして持たせておくと、扉やエンディングが増えても
 * 「読む」処理そのものは変えずに済む。
 */
export type AfterReading =
  | { kind: 'idle' }
  | { kind: 'finishTalk'; talkId: TalkId }
  | { kind: 'choosing'; gate: Gate }
  | { kind: 'openGate'; gate: Gate; fragmentId: FragmentId }
  | { kind: 'ending'; ending: Ending };

/**
 * 読み始めの場面を組む。読みの場面を立てる道はここ一本だけにする
 * （型では縛れないので、道を増やすときは scene.test.ts に組を足すこと）。
 *
 * 一度読み切ったものは、はじめから全文を開く。二周目の人に同じ言葉を
 * 一字ずつ送り直さないため。飛ばすのではなく待ち時間だけを消すので、
 * 全文はその場に残り、読み返しながら考えられる。
 *
 * まだ読んでいないものは、何行あっても一行目から。ここが崩れると
 * 「読ませないまま先へ行かせない」が根から崩れる。
 *
 * 言葉の無い読み物でも一行目を開いた形にしておく（shown が 0 だと、
 * 読んでいる行が無いまま場面だけが立つ）。
 */
export function beginReading(
  lore: Lore,
  reading: Reading,
  lines: ShownLine[],
  then: AfterReading = { kind: 'idle' },
): ReadingScene {
  const read = hasRead(lore, reading);
  return {
    kind: 'reading',
    reading,
    lines,
    shown: read ? Math.max(1, lines.length) : 1,
    instant: read,
    then,
  };
}

/**
 * 町を畳んで手もとだけを見せる場面か。戸の前と、終わったあと。
 * 配列で持たず switch で書くのは、Scene に枝を足したときに
 * 書き忘れが黙って「町が見えたまま」に落ちないようにするため。
 */
export function isFacing(scene: Scene): boolean {
  switch (scene.kind) {
    case 'choosing':
    case 'ending':
    case 'trace':
      return true;
    case 'idle':
    case 'reading':
    case 'note':
      return false;
    default: {
      const exhaustive: never = scene;
      throw new Error(`未処理の場面: ${JSON.stringify(exhaustive)}`);
    }
  }
}
