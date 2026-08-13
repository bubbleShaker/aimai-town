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
 * 並べるのは「置いた一枚」と「置かなかったもの」だけで、
 * それをどう読むかはプレイヤーの側に残す。
 *
 * 戸ごとに、したこと（動詞）と置いた一枚を先に出す。
 * 置いた一枚を末尾に置くと、間に架けた戸では三行目まで読まないと何をしたか分からず、
 * 戸が増えるほど読み流される。並べ替えるだけで、言葉は足さない。
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
              <p className="trace-gate">
                {t.gate.name}
                <span className="trace-verb">{t.bridged ? 'あいだに置いた' : 'そのまま置いた'}</span>
              </p>
              {/* したことの次に、置いた一枚。架けた戸でもそうでない戸でも同じ位置に来る */}
              <p className="trace-card is-placed">「{t.offered.text}」</p>
              {/* 置かなかったぶんは engine が数えている。UI では引き算しない */}
              {t.unplaced.length > 0 && (
                <>
                  <p className="trace-unplaced">置かなかった</p>
                  <ul className="trace-unplaced-list">
                    {t.unplaced.map((f) => (
                      <li key={f.id} className="trace-card">
                        「{f.text}」
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </li>
          ))}
        </ul>
        {closing.map((line, i) => (
          <p key={i} className="trace-closing">
            {line.text}
          </p>
        ))}
        {/*
          借りた音の出どころ。素材の規約で表示が要る。
          町を歩いているあいだではなく、物語が閉じたここに置く。
          世界の言葉ではないので scenario からは渡さず、締めの文とも見た目を分ける。
        */}
        <p className="trace-credit">BGM: MusMus</p>
      </div>
      <button className="button is-lit" onClick={onRestart}>
        もう一度、町へ降りる
      </button>
    </div>
  );
}
