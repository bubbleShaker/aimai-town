import { useEffect, useMemo, useRef, useState } from 'react';

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

/** 演出を減らす設定の人には、一字送りをしない */
function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * いま読んでいる一行を、一字ずつ送る。
 *
 * 送った文字数は「表示の都合」なので engine にも Scene にも置かず、ここだけで持つ。
 *
 * 「何を何行目まで送ったか」を字数と対で持つのは、行が変わった瞬間に
 * 前の行の字数が新しい行にあてはまるのを防ぐため。effect の初期化を待つ作りだと、
 * 一枚だけ次の行が全文で出てしまい、その隙に触れると一字も読ませず次の場面へ行けてしまう。
 * 行番号と文面の両方を見るのは、同じ文が二行続く場合と、
 * 同じ行番号のまま別の文へ差し替わる場合の両方で送り直すため。
 *
 * 数えるのはコードポイント単位。`slice` だと、サロゲートペアの文字を
 * 途中で断ち割って壊れた字を出しうるため。
 */
function useTypewriter(text: string, lineNo: number, instant: boolean) {
  const chars = useMemo(() => Array.from(text), [text]);
  const total = chars.length;

  const [progress, setProgress] = useState({ text, lineNo, sent: 0 });
  let sent = progress.text === text && progress.lineNo === lineNo ? progress.sent : 0;
  if (instant) sent = total;

  // 一字進むごとに次の一字を予約する。出し切ったら予約しないので自然に止まり、
  // 触れて出し切ったときも、行が変わったときも、後片付けで待ちが消える
  useEffect(() => {
    if (sent >= total) return;
    const timer = setTimeout(() => setProgress({ text, lineNo, sent: sent + 1 }), TYPE_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [text, lineNo, sent, total]);

  return {
    /** ここまで送った分の文字列 */
    revealedText: chars.slice(0, sent).join(''),
    typing: sent < total,
    /** いまの行を出し切る */
    finish: () => setProgress({ text, lineNo, sent: total }),
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
  const { revealedText, typing, finish } = useTypewriter(current?.text ?? '', shown, instant);

  const done = shown >= lines.length && !typing;

  /*
   * 行が増えるたび、また字が伸びるたび最下部へ寄せる。
   * ただし指で上へさかのぼっているあいだは追わない。一字進むたび引き戻されると読み返せない。
   *
   * 追うかどうかは指で動かされたときだけ決め直す。
   * 字が伸びた後の距離で測ると、伸びた高さのぶんだけ下端から離れたと見えて追うのをやめ、
   * 増えた行が画面の外に置き去りになる。
   */
  const following = useRef(true);
  const placed = useRef(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && following.current) {
      el.scrollTop = el.scrollHeight;
      placed.current = el.scrollTop; // 行き着いた先は頼んだ値と違いうるので読み直す
    }
  }, [shown, revealedText]);

  /** 触れたときの動き。送っている途中なら、進むより先にその行を出し切る */
  function advance() {
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
        onScroll={(e) => {
          const el = e.currentTarget;
          // こちらから合わせた分は数えない。scroll の報せは一拍遅れて届き、
          // その頃には字が伸びて下端が動いているため、距離で測ると追うのをやめてしまう
          if (Math.abs(el.scrollTop - placed.current) < 2) return;
          following.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
        }}
      >
        {lines.slice(0, shown).map((line, i) => {
          // 送っている途中なのは最後の一行だけ。それより前は全文が残る
          const body = i === shown - 1 ? revealedText : line.text;
          return (
            <p
              key={i}
              className={['line', line.speaker && 'is-speech', line.fragment && 'is-fragment']
                .filter(Boolean)
                .join(' ')}
            >
              {line.speaker && <span className="line-speaker">{line.speaker}</span>}
              {/* 断片を得た報せと括弧は送らず先に出す。閉じない鉤括弧が出たままにならないよう */}
              {line.fragment ? `断片を得た　「${body}」` : body}
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
