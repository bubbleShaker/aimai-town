import type { Fragment } from './types';

/**
 * 信念の断片。
 * ひとつひとつが、両立するとは限らない命題であることが重要。
 * 扉（M2）はこの中から矛盾する二枚を選んで突きつけてくる。
 */
export const fragments: Fragment[] = [
  {
    id: 'f-approval',
    text: '認められたい、はいちばん古い火だ',
    source: '広場の子ども',
  },
  {
    id: 'f-empty-time',
    text: '目的のない時間は、空虚だ',
    source: '広場の名もなき人',
  },
  {
    id: 'f-autonomy',
    text: '手は自分のものだ。誰にも預けない',
    source: '織り手の親方',
  },
  {
    id: 'f-respect',
    text: '隣の織り目とは、合わせる',
    source: '織り手の親方',
  },
  {
    id: 'f-solitude',
    text: '誰も介さずに満ちている、それが真の幸福だ',
    source: '井戸に落とした自分の声',
  },
];
