import { useEffect, useRef, useState } from 'react';

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

/** 画面に出る文字列。断片の獲得は、行そのものを整えてから送る */
function lineText(line: ShownLine): string {
  return line.fragment ? `断片を得た　「${line.text}」` : line.text;
}

/** 演出を減らす設定の人には、一字送りをしない */
function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * いま読んでいる一行を、一字ずつ送る。
 *
 * 送った文字数は「表示の都合」なので engine にも Scene にも置かず、ここだけで持つ。
 * `resetKey`（何行目か）も見て送り直すのは、同じ文が二行続いたときに
 * 二行目が送られず一度に出てしまうのを防ぐため。
 *
 * 文字数ではなく書記素の配列で数える。`slice` だと、サロゲートペアの
 * 文字を途中で断ち割って壊れた字を出しうるため。
 */
function useTypewriter(text: string, resetKey: number, instant: boolean) {
  const chars = Array.from(text);
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    const total = Array.from(text).length;
    if (instant) {
      setRevealed(total);
      return;
    }
    setRevealed(0);
    const timer = setInterval(() => {
      setRevealed((n) => {
        if (n >= total) {
          clearInterval(timer);
          return n;
        }
        return n + 1;
      });
    }, TYPE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [text, resetKey, instant]);

  return {
    /** ここまで出した分の文字列 */
    revealedText: chars.slice(0, revealed).join(''),
    typing: revealed < chars.length,
    /** いまの行を出し切る */
    finish: () => setRevealed(chars.length),
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
  const { revealedText, typing, finish } = useTypewriter(
    current ? lineText(current) : '',
    shown,
    instant,
  );

  const done = shown >= lines.length && !typing;

  // 行が増えるたび、また字が伸びるたび最下部へ寄せる。上にあふれた分は指でさかのぼれる
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
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
      <div className="story-lines" ref={scrollRef}>
        {lines.slice(0, shown).map((line, i) => (
          <p
            key={i}
            className={[
              'line',
              line.speaker && 'is-speech',
              line.fragment && 'is-fragment',
              // 一字ずつ出るなら、それ自体が浮かび上がりなので emerge は重ねない。
              // 送っている行だけに付けると、出し切った拍子にフェードが走り直す
              !instant && 'is-typed',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {line.speaker && <span className="line-speaker">{line.speaker}</span>}
            {i === shown - 1 ? revealedText : lineText(line)}
          </p>
        ))}
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
