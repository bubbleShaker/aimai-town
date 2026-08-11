interface Props {
  on: boolean;
  onToggle: () => void;
}

/**
 * 音を止める口。町の隅にいつも出しておく。
 *
 * 場面によって隠さない。鳴り出した音を止めたい人が、止められる場面を探して
 * 歩き回ることになるため。畳まれる町（.map）の中には入れない。
 */
export function SoundToggle({ on, onToggle }: Props) {
  return (
    <button
      className={on ? 'sound is-on' : 'sound'}
      /* 押すごとに入れ替わる口であることと、今どちらかを、読み上げにも伝える */
      aria-pressed={on}
      onClick={(e) => {
        /*
         * 物語欄の上に浮いているので、押した拍子に一行進まないよう伝播を止める。
         * いまは物語欄の外にあって昇っていかないが、置き場所を変えた人が
         * 「音を止めようとしたら話が進んだ」を作らないように、ここで止めておく。
         */
        e.stopPropagation();
        onToggle();
      }}
    >
      <span className="sr-only">{on ? '音を止める' : '音を鳴らす'}</span>
      <span aria-hidden="true">♪</span>
    </button>
  );
}
