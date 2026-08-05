import type { Fragment, FragmentId } from '../scenario/types';

interface Props {
  title: string;
  /** 扉が突きつける、両立しないように見える二枚 */
  tension: Fragment[];
  /** 差し出せる手持ちの断片 */
  hand: Fragment[];
  onOffer: (fragmentId: FragmentId) => void;
  onLeave: () => void;
}

/**
 * 扉の前。二枚のあいだに置く一枚を選ぶ。
 * どれを選んでも扉は開くので、ここに正解／不正解の表示は無い。
 */
export function GateView({ title, tension, hand, onOffer, onLeave }: Props) {
  return (
    <div className="gate">
      <h2 className="gate-title">{title}</h2>

      <div className="gate-tension">
        {tension.map((f, i) => (
          <div key={f.id}>
            {i > 0 && <p className="gate-versus">と</p>}
            <p className="gate-tension-text">「{f.text}」</p>
          </div>
        ))}
      </div>

      <div className="gate-body">
        {hand.length === 0 ? (
          <p className="gate-empty">
            差し出せる言葉を、まだ何も持っていない。
            <br />
            町を歩き、誰かの言葉を拾ってから戻るしかない。
          </p>
        ) : (
          <>
            <p className="gate-prompt">この間に置く一枚を選ぶ</p>
            <ul className="gate-hand">
              {hand.map((f) => (
                <li key={f.id}>
                  <button className="button" onClick={() => onOffer(f.id)}>
                    <span className="gate-hand-text">「{f.text}」</span>
                    <span className="gate-hand-source">— {f.source}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <button className="button is-quiet" onClick={onLeave}>
        戸から離れる
      </button>
    </div>
  );
}
