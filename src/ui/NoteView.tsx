import type { Fragment } from '../scenario/types';

interface Props {
  fragments: Fragment[];
  onClose: () => void;
}

/** 思索のノート。集めた断片を並べて眺めるだけの画面 */
export function NoteView({ fragments, onClose }: Props) {
  return (
    <div className="note" role="dialog" aria-label="思索のノート">
      <h2 className="note-title">思索のノート</h2>
      {fragments.length === 0 ? (
        <p className="note-empty">まだ、なにも言葉になっていない。</p>
      ) : (
        <ul className="note-list">
          {fragments.map((f) => (
            <li key={f.id} className="note-item">
              <p className="note-text">「{f.text}」</p>
              <p className="note-source">— {f.source}</p>
            </li>
          ))}
        </ul>
      )}
      <button className="button" onClick={onClose}>
        閉じる
      </button>
    </div>
  );
}
