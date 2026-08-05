import type { GateTrace } from '../engine/state';
import type { Line } from '../scenario/types';

interface Props {
  traces: GateTrace[];
  /** 締めの文。世界の言葉なので scenario から受け取る */
  closing: Line[];
  onRestart: () => void;
}

/**
 * 灯の名のあとに残る、戸の前でしたことの一覧。
 *
 * ここでも評価はしない。軸の値も、何番目のエンドかも、正しさの示唆も出さない。
 * 並べるのは「突きつけられた二枚」と「置いた一枚」だけで、
 * それをどう読むかはプレイヤーの側に残す。
 *
 * 戸が増えても「もう一度」に手が届くよう、スクロールは本文の中だけに閉じる。
 */
export function TraceView({ traces, closing, onRestart }: Props) {
  return (
    <div className="trace">
      <h2 className="trace-title">置いてきたもの</h2>
      <div className="trace-body">
        <ul className="trace-list">
          {traces.map((t) => (
            <li key={t.gate.id} className="trace-item">
              <p className="trace-gate">{t.gate.name}</p>
              <ul className="trace-tension">
                {t.tension.map((f) => (
                  <li
                    key={f.id}
                    /* 二枚のうちの一枚をそのまま置いた戸では、その一枚に灯が残る */
                    className={f.id === t.offered.id ? 'trace-card is-placed' : 'trace-card'}
                  >
                    「{f.text}」
                  </li>
                ))}
              </ul>
              {t.bridged ? (
                <>
                  <p className="trace-verb">あいだに置いた</p>
                  <p className="trace-card is-placed">「{t.offered.text}」</p>
                </>
              ) : (
                <p className="trace-verb">二枚のうちの一枚を、そのまま置いた</p>
              )}
            </li>
          ))}
        </ul>
        {closing.map((line, i) => (
          <p key={i} className="trace-closing">
            {line.text}
          </p>
        ))}
      </div>
      <button className="button is-lit" onClick={onRestart}>
        もう一度、町へ降りる
      </button>
    </div>
  );
}
