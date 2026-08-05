import { useEffect, useRef } from 'react';

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
}

/**
 * 物語の表示欄。読んだ行は消さずに積み上げ、下に伸ばしていく。
 * 全文がその場に残るので、言葉を読み返しながら考えられる。
 */
export function StoryView({ lines, shown, onAdvance }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const done = shown >= lines.length;

  // 行が増えるたび最下部へ寄せる。上にあふれた分は指でさかのぼれる
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [shown]);

  return (
    <div className="story" onClick={onAdvance}>
      <div className="story-lines" ref={scrollRef}>
        {lines.slice(0, shown).map((line, i) => (
          <p
            key={i}
            className={['line', line.speaker && 'is-speech', line.fragment && 'is-fragment']
              .filter(Boolean)
              .join(' ')}
          >
            {line.speaker && <span className="line-speaker">{line.speaker}</span>}
            {line.fragment ? `断片を得た　「${line.text}」` : line.text}
          </p>
        ))}
      </div>
      {/* 画面のどこを触っても進むが、操作の主体はこのボタンとして示す。
          親にも onClick があるので、二重に進まないよう伝播を止める */}
      <button
        className="story-next"
        onClick={(e) => {
          e.stopPropagation();
          onAdvance();
        }}
      >
        {done ? '▼ もどる' : '▼ つづける'}
      </button>
    </div>
  );
}
