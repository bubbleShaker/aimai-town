/**
 * 世界の型定義。
 * ここは「データの形」だけを決める層で、React にも DOM にも依存しない。
 * 世界観を書き足す作業（scenario/）と、ルールを書く作業（engine/）を切り離すための境界。
 */

/** 場所の識別子。string の別名だが、FragmentId などと取り違えないよう型で区別する */
export type PlaceId = string;
export type FragmentId = string;
export type TalkId = string;
export type GateId = string;

/** 信念の断片。プレイヤーが集める短い命題 */
export interface Fragment {
  id: FragmentId;
  /** 断片そのものの言葉 */
  text: string;
  /** 誰の言葉として得たか */
  source: string;
}

/** 対話の一行。speaker が無ければ地の文として扱う */
export interface Line {
  speaker?: string;
  text: string;
}

/** 住人との対話ひとまとまり */
export interface Talk {
  id: TalkId;
  /** 選択肢に出る見出し（誰に話しかけるか） */
  label: string;
  lines: Line[];
  /** この対話を終えると手に入る断片 */
  grants: FragmentId[];
}

/** 町の場所。ノードマップの一点になる */
export interface Place {
  id: PlaceId;
  name: string;
  /** マップ上の位置（0〜100 の相対座標。画面幅に依らず配置するため） */
  x: number;
  y: number;
  /** 到着したときの地の文 */
  arrival: Line[];
  talks: Talk[];
  /** 直接歩いていける場所 */
  links: PlaceId[];
}

/**
 * 選択が動かす二本の軸。プレイヤーには数値を見せない。
 * distance … 負なら孤独へ、正なら関わりへ
 * certainty … 負なら曖昧へ、正なら確信へ
 */
export interface AxisShift {
  distance: number;
  certainty: number;
}

/** 断片を差し出したときに扉が返すもの */
export interface GateResponse {
  lines: Line[];
  shift: AxisShift;
}

/**
 * 扉。両立しないように見える二枚を突きつけ、その間に置く一枚を要求する。
 * どの断片を差し出しても開く。変わるのは返る言葉と、記録される軸だけ。
 */
export interface Gate {
  id: GateId;
  name: string;
  /** この扉の向こうにある場所。ここへ入るには扉を開く必要がある */
  beyond: PlaceId;
  /** 突きつけられる、両立しないように見える二枚 */
  tension: [FragmentId, FragmentId];
  /** 扉の口上 */
  prologue: Line[];
  /** 差し出された断片ごとの返答。書かれていないものには fallback を使う */
  responses: Record<FragmentId, GateResponse>;
  fallback: GateResponse;
}

/**
 * 終幕の名。
 * どれを引くかを決めるのは engine なので、id は増やせる集合ではなく決まった集合にする。
 * こうしておくと World.endings が Record になり、「文が書かれていないエンド」を型で消せる。
 */
export type EndingId =
  | 'e-lighthouse'
  | 'e-weaver'
  | 'e-square'
  | 'e-fog'
  | 'e-halfway'
  | 'e-nameless';

/** 終幕。どのエンドにも優劣はない。「正解のエンド」は作らない */
export interface Ending {
  id: EndingId;
  name: string;
  lines: Line[];
}

/** 世界そのもの。engine はこれを外から渡される（データとルールの分離） */
export interface World {
  start: PlaceId;
  /** 終幕の場所。町の扉をすべて開くまで、ここへは入れない */
  finale: PlaceId;
  places: Place[];
  fragments: Fragment[];
  gates: Gate[];
  /** すべての EndingId に文があることを、型で要求する */
  endings: Record<EndingId, Ending>;
  /**
   * 灯の名を見たあと、置いてきたものの末尾に残る文。
   * どの灯で終わっても同じことしか言わない（灯によって言い方を変えると、
   * そこに優劣が生まれるため）。
   */
  closing: Line[];
}
