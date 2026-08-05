import type { Ending } from '../scenario/types';

interface Props {
  ending: Ending;
  /** 置いてきたものを見に行く。灯を眺めるだけの間を壊さないよう、控えめに置く */
  onLookBack: () => void;
}

/**
 * 終幕。文を読み終えたあとに、灯の名だけが残る画面。
 *
 * 何番目のエンドかも、他にいくつあるかも出さない。
 * 見せた瞬間に「集めるもの」になり、どのエンドにも優劣をつけない作法が崩れるため。
 */
export function EndingView({ ending, onLookBack }: Props) {
  return (
    <div className="ending">
      <p className="ending-lead">あなたの灯は</p>
      <h2 className="ending-name">{ending.name}</h2>
      <button className="button is-quiet ending-back" onClick={onLookBack}>
        置いてきたものを見る
      </button>
    </div>
  );
}
