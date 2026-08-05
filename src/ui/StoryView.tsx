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
  const done = shown >= lines.length;
  return (
    <div
      className="story"
      onClick={onAdvance}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onAdvance();
      }}
    >
      <div className="story-lines">
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
      <p className="story-hint">{done ? '▼ もどる' : '▼ つづける'}</p>
    </div>
  );
}
