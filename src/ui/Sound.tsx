import { BGM_SOURCE, useBgm } from './useBgm';

/**
 * 町の音と、それを止める口。
 *
 * 音そのものと、止める口と、鳴らし方を一枚に閉じてある。
 * 音の要素だけを外に出すと、loop を落とすような書き換えが誰にも止められない。
 *
 * 進行（GameState / Scene）を受け取らない。音は世界の状態を映さないと決めたので、
 * 渡す道そのものを作らない。場面で曲を変えようとした人は、まずここに引数を足すことになり、
 * そこで決めごとに突き当たる。
 */
export function Sound() {
  const { ref, on, preload, toggle } = useBgm();

  return (
    <>
      {/*
        音そのもの。姿は持たない（CSS で隠してある）が、隠れていても鳴る。
        loop を付けるのは、一曲を切れ目なく流し続けるため。
        繰り返しの数は数えていないので、どれだけ町にいたかは音からは分からない。
      */}
      <audio ref={ref} className="bgm" src={BGM_SOURCE} loop preload={preload} />

      {/*
        止める口。町の隅にいつも出しておく。場面によって隠すと、
        鳴り出した音を止めたい人が、止められる場面を探して歩き回ることになる。
      */}
      <button
        className={on ? 'sound is-on' : 'sound'}
        onClick={(e) => {
          /*
           * 物語欄の上に浮いているので、押した拍子に一行進まないよう伝播を止める。
           * いまは物語欄の外にあって昇っていかないが、置き場所を変えた人が
           * 「音を止めようとしたら話が進んだ」を作らないように、ここで止めておく。
           */
          e.stopPropagation();
          toggle();
        }}
      >
        {/*
          読み上げには、押すと何が起きるかを渡す。
          aria-pressed は付けない。付けると「音を止める、押されています」と二重に読まれ、
          いまどちらなのかがかえって分からなくなる。
        */}
        <span className="sr-only">{on ? '音を止める' : '音を鳴らす'}</span>
        <span aria-hidden="true">♪</span>
      </button>
    </>
  );
}
