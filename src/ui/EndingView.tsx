import type { Ending } from '../scenario/types';

interface Props {
  ending: Ending;
}

/**
 * 終幕。文を読み終えたあとに、灯の名だけが残る画面。
 *
 * 何番目のエンドかも、他にいくつあるかも出さない。
 * 見せた瞬間に「集めるもの」になり、どのエンドにも優劣をつけない作法が崩れるため。
 */
export function EndingView({ ending }: Props) {
  return (
    <div className="ending">
      <p className="ending-lead">あなたの灯は</p>
      <h2 className="ending-name">{ending.name}</h2>
    </div>
  );
}
