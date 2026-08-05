/**
 * 世界の型定義。
 * ここは「データの形」だけを決める層で、React にも DOM にも依存しない。
 * 世界観を書き足す作業（scenario/）と、ルールを書く作業（engine/）を切り離すための境界。
 */

/** 場所の識別子。string の別名だが、FragmentId などと取り違えないよう型で区別する */
export type PlaceId = string;
export type FragmentId = string;
export type TalkId = string;

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

/** 世界そのもの。engine はこれを外から渡される（データとルールの分離） */
export interface World {
  start: PlaceId;
  places: Place[];
  fragments: Fragment[];
}
