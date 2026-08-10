import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { isAtBottom } from './follow';
import type { ShownLine } from './scene';
import { sentSoFar, type TypeProgress, type TypeTarget } from './typewriter';

interface Props {
  /**
   * 読ませる言葉。ひと続きの読みのあいだ、配列の実体は変えないこと。
   * どこまで送ったかをこの実体で見分けているので、
   * 描くたびに新しい配列を渡すと一字も進まないまま固まる。
   */
  lines: ShownLine[];
  /** これまでに表示した行数 */
  shown: number;
  onAdvance: () => void;
  /** 読み終えたときのボタンの文字。行き先が「もどる」でない場面で差し替える */
  doneLabel?: string;
  /**
   * 一字ずつ送らず、はじめから出し切るか。
   * 一度読み切った言葉に使う（同じ言葉を二度、同じ速さで待たせないため）。
   * 場面ごとに決まるので props で受ける。演出を減らす設定とは別に見る。
   */
  instant?: boolean;
}

/** 一字を送る間隔（ミリ秒）。読む速さより少し遅くして、言葉に間を作る */
const TYPE_INTERVAL_MS = 45;

/** 断片を得た報せと括弧は送らず先に出す。閉じない鉤括弧が出たままにならないよう */
function dress(line: ShownLine, body: string): string {
  return line.fragment ? `断片を得た　「${body}」` : body;
}

/** 演出を減らす設定の人には、一字送りをしない */
function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * いま読んでいる一行を、一字ずつ送る。
 *
 * 送った文字数は「表示の都合」なので engine にも Scene にも置かず、ここだけで持つ。
 * どの行をどこまで送ったかの照らし合わせは `sentSoFar` に出してある（そこで縛れるように）。
 *
 * 数えるのはコードポイント単位。`slice` だと、サロゲートペアの文字を
 * 途中で断ち割って壊れた字を出しうるため。
 */
function useTypewriter(target: TypeTarget, instant: boolean) {
  const chars = useMemo(() => Array.from(target.text), [target.text]);
  const total = chars.length;

  const [progress, setProgress] = useState<TypeProgress>({ ...target, sent: 0 });
  const sent = sentSoFar(progress, target, total, instant);

  // 一字進むごとに次の一字を予約する。出し切ったら予約しないので自然に止まり、
  // 触れて出し切ったときも、行が変わったときも、後片付けで待ちが消える
  useEffect(() => {
    if (sent >= total) return;
    const timer = setTimeout(() => setProgress({ ...target, sent: sent + 1 }), TYPE_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [target, sent, total]);

  return {
    /** ここまで送った分の文字列 */
    revealedText: chars.slice(0, sent).join(''),
    typing: sent < total,
    /** いまの行を出し切る */
    finish: () => setProgress({ ...target, sent: total }),
  };
}

/**
 * 物語の表示欄。読んだ行は消さずに積み上げ、下に伸ばしていく。
 * 全文がその場に残るので、言葉を読み返しながら考えられる。
 *
 * 最後の一行だけが一字ずつ送られる。触れると、まずその行が出し切られ、
 * 出し切ってからもう一度触れると次へ進む。
 */
export function StoryView({
  lines,
  shown,
  onAdvance,
  doneLabel = '▼ もどる',
  instant = false,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // 読んでいるあいだに設定が変わることは見ない。行ごとに送り方が変わる方が戸惑わせる
  const [reduced] = useState(prefersReducedMotion);

  const current = lines[shown - 1];
  // 場面の実体も渡す。同じ文が同じ行番号で続く場面へ移っても送り直せるように
  const target = useMemo(
    () => ({ source: lines, lineNo: shown, text: current?.text ?? '' }),
    [lines, shown, current?.text],
  );
  const { revealedText, typing, finish } = useTypewriter(target, instant || reduced);

  const done = shown >= lines.length && !typing;

  /*
   * 行が増えるたび、また字が伸びるたび最下部へ寄せる。
   * ただし上へさかのぼっているあいだは追わない。一字進むたび引き戻されると読み返せない。
   *
   * 追うかどうかは、動いた先がどこかだけで決める。指もホイールも矢印キーも
   * つまみのドラッグも、位置が動けば必ずここへ落ちてくるので取りこぼしが無い。
   * 入力の種類で見分けようとすると、位置の動かない入力（下端でさらに下へ回す、
   * 指を置いたまま微動する）で追うのをやめたきり、戻す報せが来ないまま固まる。
   */
  const following = useRef(true);

  /*
   * 開いた時点で全文が入っている場面（一度読んだもの）だけは、下端ではなく冒頭を見せる。
   * 下端に寄せると、待たせない代わりに読み返しの入口を失う。
   * 待ち時間を消したつもりが、読み手には飛ばされたのと同じ見え方になってしまう。
   *
   * ここは既読（instant）だけを見る。演出を減らす設定（reduced）と混ぜてはいけない。
   * 混ぜると、その設定の人が「まだ読んでいない」言葉を一行ずつ進めるあいだ、
   * 行が増えて最終行に届くたび冒頭へ引き戻され、増えた行が画面の外に置き去りになる。
   * それは assertNotLeftBehind が塞いでいる崩れ方そのもの。
   */
  const openedWhole = instant && shown >= lines.length;

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || !following.current) return;
    el.scrollTop = openedWhole ? 0 : el.scrollHeight;
  }, [shown, revealedText, openedWhole]);

  /** 触れたときの動き。送っている途中なら、進むより先にその行を出し切る */
  function advance() {
    /*
     * 言葉を選んでいる手は、進めたい手ではない。
     * 本文は選んで読み返せるようにしてあるので、選び終えて指を離した拍子に
     * 話が進むと、読み返そうとした人ほど置いていかれる。
     */
    if (getSelection()?.isCollapsed === false) return;

    /*
     * 進むと決めた人には、新しい行を必ず見せる。
     * 読み返しで追うのをやめたまま行だけ増えると、増えた行は画面の外に出たままになり、
     * 何も起きていないように見えて叩き続け、一行も目にしないまま次の場面へ行ける。
     * 出し切るだけのときも戻すのは、そのひと触れも「見せてほしい」意思だから。
     */
    following.current = true;

    if (typing) {
      finish();
      return;
    }
    onAdvance();
  }

  return (
    <div className="story" onClick={advance}>
      <div
        className="story-lines"
        ref={scrollRef}
        /* 積み上げた言葉を読み返す場所。キーだけで操る人にも矢印で辿らせる */
        tabIndex={0}
        role="region"
        aria-label="これまでの言葉"
        onScroll={(e) => {
          const el = e.currentTarget;
          following.current = isAtBottom(el.scrollHeight, el.scrollTop, el.clientHeight);
        }}
      >
        {lines.slice(0, shown).map((line, i) => {
          // 送っている途中なのは最後の一行だけ。それより前は全文が残る
          const isTyping = i === shown - 1 && typing;
          return (
            <p
              key={i}
              className={['line', line.speaker && 'is-speech', line.fragment && 'is-fragment']
                .filter(Boolean)
                .join(' ')}
            >
              {line.speaker && <span className="line-speaker">{line.speaker}</span>}
              {isTyping ? (
                <>
                  {/* 送りかけの文は目にだけ見せる。欠けたまま読み上げても言葉にならないため、
                      読み上げには全文を渡す。読み上げを急かさないよう aria-live は付けない */}
                  <span aria-hidden="true">{dress(line, revealedText)}</span>
                  <span className="sr-only">{dress(line, line.text)}</span>
                </>
              ) : (
                dress(line, line.text)
              )}
            </p>
          );
        })}
      </div>
      {/* 画面のどこを触っても進むが、操作の主体はこのボタンとして示す。
          親にも onClick があるので、二重に進まないよう伝播を止める */}
      <button
        className="story-next"
        onClick={(e) => {
          e.stopPropagation();
          advance();
        }}
      >
        {done ? doneLabel : '▼ つづける'}
      </button>
    </div>
  );
}
