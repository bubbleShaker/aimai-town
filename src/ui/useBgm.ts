import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { loadSoundOn, saveSoundOn } from '../store/sound';

/**
 * 町に流れる一曲。鳴らす・止める・立ち上げるところだけを引き受ける。
 *
 * 音は世界の状態を映さない。場所でも軸でも終幕でも曲を変えないので、
 * ここは GameState も Scene も受け取らない（受け取れないようにしてある）。
 * 灯の色を選択で変えないのと同じ理由で、音が隠しパラメータの示唆になってはいけない。
 */

/**
 * 素材の在り処。public/ に置いてあるので、ビルドを通っても名前が変わらない。
 * `import.meta.env.BASE_URL` は Vite が公開先の起点（ここでは /aimai-town/）に
 * 差し替える値。直に '/music/...' と書くと GitHub Pages で 404 になる。
 */
export const BGM_SOURCE = `${import.meta.env.BASE_URL}music/MusMus-BGM-015.mp3`;

/** 言葉を読むあいだ流れ続けるものなので、控えめに */
const VOLUME = 0.28;

/** 初めて立ち上がるまでの秒数。町へ降りたところで急に鳴ると、一行目を読む前に驚かせる */
const FADE_IN_S = 4;

/**
 * 止めるときと、止めたものを鳴らし直すときの秒数。
 * どちらも押した手応えが要るので、初めの立ち上がりよりずっと短くする。
 * 立ち上がりが長いのは「読む前に驚かせない」ためで、自分で押した人には当てはまらない。
 */
const FADE_BACK_S = 0.6;

/**
 * 音の通り道を組む。
 *
 * `audio.volume` に代入しないのは、iOS がそれを黙って無視するため
 * （あちらでは端末の音量ボタンだけが音量を決める）。スマホ縦持ちが前提の町で
 * volume に頼ると、iOS の人にだけ立ち上がりが効かず、最初の触れでいきなり鳴る。
 *
 * Web Audio は音を「源 → 加工 → 出口」とつないで流す仕組みで、
 * GainNode はそのうち音量を掛ける一段。ここを通した音はどの端末でも同じだけ絞れる。
 *
 * 組めなければ鳴らさない。HTML の audio へ戻す道は用意していない
 * （戻すと iOS だけ音量が効かない形が復活する。今どきのブラウザはどれも組める）。
 */
interface Chain {
  ctx: AudioContext;
  gain: GainNode;
}

function connect(audio: HTMLAudioElement): Chain | null {
  let ctx: AudioContext | null = null;
  try {
    ctx = new AudioContext();
    const gain = ctx.createGain();
    // 無音から始める。立ち上げるのは、鳴らすと決まってから
    gain.gain.value = 0;
    ctx.createMediaElementSource(audio).connect(gain).connect(ctx.destination);
    return { ctx, gain };
  } catch {
    /*
     * 音を出せない環境はある。鳴らないだけで、遊びは止めない
     * （保存が効かなくても歩みは続けられる、というのと同じ構え）。
     *
     * 途中まで組めていたら閉じる。開いたままの口を残すと、鳴らないのに
     * 音の口だけを掴み続けることになる（iOS では他のアプリの音を止めうる）。
     */
    void ctx?.close().catch(() => {});
    return null;
  }
}

/**
 * 音量を今の値から目標へ移す。
 * 今の値から引き直すのは、前の傾きが残っていると押した拍子に音が飛ぶため
 * （立ち上がり切る前に止めると、消しはじめの高さが 0 秒前の高さになる）。
 */
function ramp(gain: GainNode, to: number, seconds: number): void {
  const now = gain.context.currentTime;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(gain.gain.value, now);
  gain.gain.linearRampToValueAtTime(to, now + seconds);
}

export interface Bgm {
  /** 鳴らす audio 要素へつなぐ。要素そのものは描く側（Sound）が置く */
  ref: RefObject<HTMLAudioElement | null>;
  /** 鳴らしてよいか。実際に鳴っているかとは別（触れる前は鳴らない） */
  on: boolean;
  /**
   * 音を先に取りに行ってよいか。止めている人には取りに行かせない。
   * 素材は 1.4MB あり、鳴らさないと決めた人の通信を黙って使うことになる。
   */
  preload: 'auto' | 'none';
  toggle: () => void;
}

export function useBgm(): Bgm {
  const ref = useRef<HTMLAudioElement>(null);
  /** 組んだ通り道。一度組んだら持ち続ける（同じ audio に源は一度しか作れない） */
  const chainRef = useRef<Chain | null>(null);
  /**
   * 組もうとしたか。組めなかったことと、まだ試していないことを見分けるために持つ。
   * 見分けないと、組めない端末で触れるたびに組み直しにいくことになる。
   */
  const triedRef = useRef(false);
  /**
   * 一度でも鳴ったか。二度目からの立ち上がりを短くするために覚える。
   * 立てるのは「鳴らそうとした時」ではなく「鳴り出した時」。
   * 拒まれた一度で立ててしまうと、その人にとっての初めての一音が
   * 押し戻しと同じ速さで立ち上がる（＝驚かせないための四秒が消える）。
   */
  const soundedOnceRef = useRef(false);
  const [on, setOn] = useState(loadSoundOn);
  /**
   * 鳴らす側かどうかを、描き直しを待たずに読めるところへ写しておく。
   *
   * 鳴らし始めは触れの中で同期に走るので、そこから見えるのは「いま画面に描かれている on」
   * ではなく「いまこの瞬間の on」でなければならない。止める側へ倒した直後、
   * 触れを拾う耳が外れるのは描き直しのあとで、そのあいだの触れは
   * 止めたはずの人のために音を組みにいってしまう。
   */
  const onRef = useRef(on);
  /**
   * 止める段取りの控え。effect の後片付けだけに任せない。
   *
   * 消えかけ（0.6 秒）の終わり際に鳴らす側へ戻されると、後片付けが走る前に
   * 段取りが満期を迎え、鳴らし直したそばから pause され、♪ は点いたまま無音になる。
   * 鳴らし始めが同期なら、その取り消しも同期でなければ間に合わない。
   */
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * いま鳴っているか。鳴っていれば、触れを拾い続ける必要がない。
   * 端末の側（別のアプリ、耳もとの操作）で止められたときも false に戻るので、
   * そのあと画面に触れれば鳴り直す。
   */
  const [sounding, setSounding] = useState(false);

  useEffect(() => {
    const audio = ref.current;
    if (!audio) return;
    const started = () => setSounding(true);
    const stopped = () => setSounding(false);
    audio.addEventListener('playing', started);
    audio.addEventListener('pause', stopped);
    return () => {
      audio.removeEventListener('playing', started);
      audio.removeEventListener('pause', stopped);
    };
  }, []);

  /**
   * 鳴らし始める。**触れを受け取ったその場から、同期で呼ぶ**こと。
   *
   * ここを effect の中（＝触れの一拍あと）でやると、iOS では音が出ない。
   * あちらは「いまの呼び出しが人の触れから続いているか」を呼び出し元の連なりで見ており、
   * 一度画面を描いてから呼び直したものは、触れの続きと認められずに拒まれる。
   * 拒まれ続けると、♪ は点いたまま二度と鳴らない画面になる（それが issue #25 の姿）。
   *
   * state を経由しないのはそのため。触れた回数を数えて effect に渡す作りに戻さないこと。
   *
   * 呼ぶのは、鳴らすと決まっているときだけ。止めている人のためには何も組まない
   * （通り道を組むと、鳴らさないと決めた端末で音の口が開きっぱなしになる。
   * iOS では、それだけで他のアプリの音を止めうる）。
   */
  const start = useCallback(() => {
    // 止める側へ倒したあとの触れでは組まない。描き直しを待たない ref で検める
    if (!onRef.current) return;
    const audio = ref.current;
    if (!audio) return;

    /*
     * 止める段取りが残っていたら、ここで取り消す。
     * 後片付け（effect の cleanup）に任せると描き直しのあとになり、
     * 消えかけの終わり際に戻された一度が、鳴り出したそばから止められる。
     */
    if (stopTimerRef.current !== null) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }

    if (!triedRef.current) {
      triedRef.current = true;
      chainRef.current = connect(audio);
    }
    const chain = chainRef.current;
    // 組めなかった端末では鳴らさない。組み直しには行かない（行くたびに口が増える）
    if (!chain) return;

    /*
     * 通り道は眠っていることがある（止めて眠らせたあと）。
     * 触れた今なら起こせるので、鳴らす前に必ず起こす。
     * 起こし損ねると、audio は動いているのに音だけ出ない、いちばん分かりにくい形になる。
     */
    void chain.ctx.resume().catch(() => {});
    // 鳴らせないことはある（音源が無い、端末が拒む）。黙って諦める。
    // 鳴り出すまで触れは拾い続けているので、次に触れたときまた試す
    void audio.play().catch(() => {});
  }, []);

  /** 写しがずれないようにする。倒した本人（toggle）でも書くが、道が増えても追随させる */
  useEffect(() => {
    onRef.current = on;
  }, [on]);

  useEffect(() => {
    // 触れを拾うのは、鳴らそうとしていて、まだ鳴っていないあいだだけ。
    // 止めている人の触れまで拾うと、いちばん軽くあるべき人の画面で
    // 触れるたびに音の支度が動くことになる。
    // 鳴り出したら外す（鳴っている最中に呼び直す用は無い）。
    // start を呼ぶのはここと ♪ を押したときだけで、どちらも触れの中。だから開いた直後は必ず無音になる
    if (sounding || !on) return;
    const notice = (e: Event) => {
      // 押しっぱなしのキーリピートでは呼び直さない。一度の触れで足りる
      if (e instanceof KeyboardEvent && e.repeat) return;
      start();
    };
    /*
     * 掴み取りの側（capture）で拾う。本文の触れは選択中などで途中で止まることがあり、
     * 昇ってくるのを待つと、その分だけ音が始まらない。
     *
     * 押した側（pointerdown）と離した側（pointerup）の両方を聞く。
     * どの触れを「活性化」と認めるかは端末で違い（iOS の見立ては Chromium より厳しく、
     * 離した側しか認めない見方が長く残っている）、片方だけに賭けると、
     * 認めない端末では一度も鳴らない。二度呼ばれても、鳴っているものをもう一度鳴らすだけで害は無い
     */
    const opts = { capture: true } as const;
    window.addEventListener('pointerdown', notice, opts);
    window.addEventListener('pointerup', notice, opts);
    window.addEventListener('keydown', notice, opts);
    return () => {
      window.removeEventListener('pointerdown', notice, opts);
      window.removeEventListener('pointerup', notice, opts);
      window.removeEventListener('keydown', notice, opts);
    };
  }, [on, sounding, start]);

  /*
   * 止める側は、押したその場ではなく移り変わりを見て動かす。
   * 消えるのを待ってから止めるので時を計る必要があり、触れの中に居続けられないため。
   * 触れの中でなければならないのは鳴らし始めだけで、止めるのはどこからでもできる。
   */
  useEffect(() => {
    if (on) return;
    const audio = ref.current;
    const chain = chainRef.current;
    // まだ組まれていないなら、そもそも鳴っていないので止める相手もいない
    if (!audio || !chain) return;

    // 消えてから止める。鳴らしたままにすると、止めたつもりの人の電池を使い続ける
    ramp(chain.gain, 0, FADE_BACK_S);
    const timer = setTimeout(() => {
      stopTimerRef.current = null;
      /*
       * 傾きの終わりと、時を計る側のずれで、ごくわずかな音が残ることがある。
       * 眠らせるとその高さで凍り、次に起こしたとき残りから始まるので、先に落とし切る。
       */
      const now = chain.ctx.currentTime;
      chain.gain.gain.cancelScheduledValues(now);
      chain.gain.gain.setValueAtTime(0, now);
      audio.pause();
      /*
       * 通り道は畳まず、眠らせる。
       * 畳む（close）と同じ audio 要素に源を作り直せず、二度と鳴らない画面になる。
       * かといって起こしたままにすると、止めた人の端末が音の口を掴み続ける
       * （iOS では、それだけで他のアプリの音を止めうる）。
       *
       * 眠らせるのは消え切ってから。眠っているあいだは時が進まないので、
       * 消しかけで眠らせると、その高さのまま凍る。
       */
      void chain.ctx.suspend().catch(() => {});
    }, FADE_BACK_S * 1000);
    stopTimerRef.current = timer;
    /*
     * 消し切る前に鳴らす側へ戻されたら、止める段取りごと取り消す。
     * 残しておくと、鳴り直した音が 0.6 秒後に黙って止まる。
     * ふつうは鳴らし始め（start）が同期に取り消しているので、ここは後始末の念押し
     */
    return () => {
      clearTimeout(timer);
      if (stopTimerRef.current === timer) stopTimerRef.current = null;
    };
  }, [on]);

  /*
   * 立ち上げるのは、鳴らそうとした時ではなく、実際に鳴り出した時から。
   * 呼んだ時から傾きを引くと、音が届くのを待っているあいだに絞りだけが上がり、
   * 遅い回線では「無音のまま四秒が過ぎ、全開で鳴り出す」ことになる。
   * 拒まれた端末では、そもそも初めの一音が短い立ち上がりにすり替わる。
   */
  useEffect(() => {
    const audio = ref.current;
    if (!audio || !sounding) return;

    if (!on) {
      /*
       * こちらが鳴らそうとしていないのに動き出したときは、止める。
       * 端末の側（通知に残った再生ボタンなど）から動かされることがあり、
       * そのままだと眠らせた通り道へ無音のまま流れ続けて、止めた人の電池だけが減る。
       */
      audio.pause();
      return;
    }

    const chain = chainRef.current;
    if (!chain) return;
    ramp(chain.gain, VOLUME, soundedOnceRef.current ? FADE_BACK_S : FADE_IN_S);
    soundedOnceRef.current = true;
  }, [on, sounding]);

  /**
   * 押した時に書き戻す。移り変わりを見て書かないのは、
   * まだ一度も押していない人の分まで書き込まないため（記憶が無いことにも意味がある）。
   */
  function toggle() {
    const next = !on;
    setOn(next);
    // 写しも同時に倒す。この下の start は描き直しを待たずに走るので、写しが古いと組みそこねる
    onRef.current = next;
    saveSoundOn(next);
    /*
     * 押したこと自体が触れ。ここで鳴らし始めないと、止めたまま開いた人が
     * 鳴らす側へ倒したとき、次に画面のどこかを触れるまで鳴り出さない
     * （止めているあいだは触れを拾っていないため）。
     *
     * そして、押されたその場で呼ぶことに意味がある。state が移り変わってから
     * effect で呼ぶ形にすると、iOS では「触れの続き」と認められない（start の註を見よ）。
     */
    if (next) start();
  }

  return { ref, on, preload: on ? 'auto' : 'none', toggle };
}
