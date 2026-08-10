import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { sentSoFar, type TypeProgress, type TypeTarget } from './typewriter';

/** 画面に流す一行。fragment が立っている行は断片の獲得を示す */
export interface ShownLine {
  speaker?: string;
  text: string;
  fragment?: boolean;
}

interface Props {
  lines: ShownLine[];
  /** これまでに表示した行数 */
  shown: number;
  onAdvance: () => void;
  /** 読み終えたときのボタンの文字。行き先が「もどる」でない場面で差し替える */
  doneLabel?: string;
}

/** 一字を送る間隔（ミリ秒）。読む速さより少し遅くして、言葉に間を作る */
const TYPE_INTERVAL_MS = 45;

/** 下端に着いているとみなす距離（px）。一行の高さに満たない程度 */
const NEAR_BOTTOM_PX = 24;

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
export function StoryView({ lines, shown, onAdvance, doneLabel = '▼ もどる' }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // 読んでいるあいだに設定が変わることは見ない。行ごとに送り方が変わる方が戸惑わせる
  const [instant] = useState(prefersReducedMotion);

  const current = lines[shown - 1];
  // 場面の実体も渡す。同じ文が同じ行番号で続く場面へ移っても送り直せるように
  const target = useMemo(
    () => ({ source: lines, lineNo: shown, text: current?.text ?? '' }),
    [lines, shown, current?.text],
  );
  const { revealedText, typing, finish } = useTypewriter(target, instant);

  const done = shown >= lines.length && !typing;

  /*
   * 行が増えるたび、また字が伸びるたび最下部へ寄せる。
   * ただし指で上へさかのぼっているあいだは追わない。一字進むたび引き戻されると読み返せない。
   */
  const following = useRef(true);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && following.current) el.scrollTop = el.scrollHeight;
  }, [shown, revealedText]);

  /*
   * 指やホイールで動かされたら、その場で追うのをやめる。
   * 位置の差から人の手か機械かを見分ける作りだと、指が動かした後に
   * 送りの上書きが先に届いた回で、さかのぼりが無かったことになる。
   * 動かす意思そのものを入力の側で受け取れば、その競り合いが起きない。
   */
  function releaseFollow() {
    following.current = false;
  }

  /** 触れたときの動き。送っている途中なら、進むより先にその行を出し切る */
  function advance() {
    if (typing) {
      finish();
      return;
    }
    /*
     * 進むと決めた人には、新しい行を必ず見せる。
     * 読み返しで追うのをやめたまま行だけ増えると、増えた行は画面の外に出たままになり、
     * 何も起きていないように見えて叩き続け、一行も目にしないまま次の場面へ行ける。
     */
    following.current = true;
    onAdvance();
  }

  return (
    <div className="story" onClick={advance}>
      <div
        className="story-lines"
        ref={scrollRef}
        onWheel={releaseFollow}
        onTouchMove={releaseFollow}
        onScroll={(e) => {
          // 下端まで戻ってきたら、また追いはじめる
          const el = e.currentTarget;
          following.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
        }}
      >
        {lines.slice(0, shown).map((line, i) => {
          /** 断片を得た報せと括弧は送らず先に出す。閉じない鉤括弧が出たままにならないよう */
          const dress = (body: string) => (line.fragment ? `断片を得た　「${body}」` : body);
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
                  <span aria-hidden="true">{dress(revealedText)}</span>
                  <span className="sr-only">{dress(line.text)}</span>
                </>
              ) : (
                dress(line.text)
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
