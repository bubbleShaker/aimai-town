import { useEffect, useRef, useState, type RefObject } from 'react';
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

/** 立ち上がるまでの秒数。町へ降りたところで急に鳴ると、一行目を読む前に驚かせる */
const FADE_IN_S = 4;

/** 止めるときの秒数。押した手応えが要るので、立ち上がりよりずっと短くする */
const FADE_OUT_S = 0.5;

/**
 * 音の通り道を組む。
 *
 * `audio.volume` に代入しないのは、iOS がそれを黙って無視するため
 * （あちらでは端末の音量ボタンだけが音量を決める）。スマホ縦持ちが前提の町で
 * volume に頼ると、iOS の人にだけ立ち上がりが効かず、最初の触れでいきなり鳴る。
 *
 * Web Audio は音を「源 → 加工 → 出口」とつないで流す仕組みで、
 * GainNode はそのうち音量を掛ける一段。ここを通した音はどの端末でも同じだけ絞れる。
 * つなぎ直しはできない（同じ audio 要素に二度は源を作れない）ので、組むのは一度だけ。
 */
interface Chain {
  ctx: AudioContext;
  gain: GainNode;
}

function connect(audio: HTMLAudioElement): Chain | null {
  try {
    const ctx = new AudioContext();
    const gain = ctx.createGain();
    // 無音から始める。立ち上げるのは、鳴らすと決まってから
    gain.gain.value = 0;
    ctx.createMediaElementSource(audio).connect(gain).connect(ctx.destination);
    return { ctx, gain };
  } catch {
    // 音を出せない環境はある。鳴らないだけで、遊びは止めない
    // （保存が効かなくても歩みは続けられる、というのと同じ構え）
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
  /** 鳴らす audio 要素へつなぐ。要素そのものは描く側（Game）が置く */
  ref: RefObject<HTMLAudioElement | null>;
  /** 鳴らしてよいか。実際に鳴っているかとは別（触れる前は鳴らない） */
  on: boolean;
  toggle: () => void;
}

export function useBgm(): Bgm {
  const ref = useRef<HTMLAudioElement>(null);
  /** 組んだ通り道。一度だけ組んで持ち続ける（同じ audio に二度は源を作れない） */
  const chainRef = useRef<Chain | null>(null);
  const [on, setOn] = useState(loadSoundOn);
  /**
   * 一度でも画面に触れたか。
   * ブラウザは、触れる前のページに音を出させない（開いた瞬間に鳴るページを防ぐため）。
   * その制約に合わせるだけでなく、開いた途端に鳴らして驚かせないためでもある。
   */
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (touched) return;
    const notice = () => setTouched(true);
    // 掴み取りの側（capture）で拾う。本文の触れは選択中などで途中で止まることがあり、
    // 昇ってくるのを待つと、その分だけ音が始まらない
    const opts = { capture: true, once: true } as const;
    window.addEventListener('pointerdown', notice, opts);
    window.addEventListener('keydown', notice, opts);
    return () => {
      window.removeEventListener('pointerdown', notice, opts);
      window.removeEventListener('keydown', notice, opts);
    };
  }, [touched]);

  useEffect(() => {
    const audio = ref.current;
    // 触れるまでは何もしない。ここで play を呼ばないから、開いた直後は必ず無音
    if (!audio || !touched) return;

    chainRef.current ??= connect(audio);
    const chain = chainRef.current;
    if (!chain) return;
    const { ctx, gain } = chain;

    /*
     * 通り道は眠った状態で生まれることがある（触れる前に組んだとき）。
     * 触れた今なら起こせるので、鳴らす前に必ず起こす。
     * 起こし損ねると、audio は動いているのに音だけ出ない、いちばん分かりにくい形になる。
     */
    void ctx.resume().catch(() => {});

    if (on) {
      // 鳴らせないことはある（音源が無い、端末が拒む）。黙って諦める
      void audio.play().catch(() => {});
      ramp(gain, VOLUME, FADE_IN_S);
      return;
    }

    // 消えてから止める。鳴らしたままにすると、止めたつもりの人の電池を使い続ける
    ramp(gain, 0, FADE_OUT_S);
    const timer = setTimeout(() => audio.pause(), FADE_OUT_S * 1000);
    return () => clearTimeout(timer);
  }, [on, touched]);

  /**
   * 押した時に書き戻す。移り変わりを見て書かないのは、
   * まだ一度も押していない人の分まで書き込まないため（記憶が無いことにも意味がある）。
   */
  function toggle() {
    const next = !on;
    setOn(next);
    saveSoundOn(next);
  }

  return { ref, on, toggle };
}
