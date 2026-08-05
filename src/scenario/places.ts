import type { Place } from './types';

/**
 * 町「曖昧」の場所。
 * M1 では三つ。広場（雑談）・織り小屋（仕事）・井戸（内省）。
 * それぞれ、原典の思想のうち別々の面を担っている。
 */
export const places: Place[] = [
  {
    id: 'square',
    name: '広場',
    x: 50,
    y: 72,
    arrival: [
      { text: '霧は、人の背丈のあたりでいちばん濃い。' },
      { text: 'だから顔だけが、いくつも浮かんで見える。' },
      { text: 'それぞれの手もとに、色の違う灯がひとつずつ。' },
    ],
    links: ['loom', 'well'],
    talks: [
      {
        id: 't-child',
        label: '子どもに話しかける',
        lines: [
          { speaker: '子ども', text: 'ねえ、見て。石を見つけた' },
          { text: 'あなたはその石を見た。ただの石だった。' },
          { speaker: '子ども', text: 'すごい？' },
          { text: '答えないでいると、灯がわずかに揺れた。' },
          { speaker: '子ども', text: 'ねえ、すごいって言ってよ' },
          { text: '承認を求める光は、こんなにも真っ直ぐに伸びる。' },
          { text: 'あなたはそれを、幼いと呼びたくなる。' },
          { text: 'そう呼びたくなること自体が、少し引っかかる。' },
        ],
        grants: ['f-approval'],
      },
      {
        id: 't-nameless',
        label: '名もなき人に話しかける',
        lines: [
          { speaker: '名もなき人', text: '話すことなんて、別にないんだ' },
          { speaker: '名もなき人', text: 'なのに、こうして立っている' },
          { text: '霧の向こうで、誰かの笑い声がした。意味のある話ではなさそうだった。' },
          { speaker: '名もなき人', text: 'あんたも、そうだろう' },
          { text: '返す言葉が、うまく見つからない。' },
        ],
        grants: ['f-empty-time'],
      },
    ],
  },
  {
    id: 'loom',
    name: '織り小屋',
    x: 22,
    y: 34,
    arrival: [
      { text: '機の音が、規則正しく霧を裂いている。' },
      { text: '手を止める者は、ひとりもいない。' },
    ],
    links: ['square'],
    talks: [
      {
        id: 't-master',
        label: '織り手の親方に話しかける',
        lines: [
          { speaker: '親方', text: '手は自分のものだ。誰にも預けない' },
          { speaker: '親方', text: 'だがな、隣の織り目とは合わせる' },
          { speaker: '親方', text: '合わせないと、布にならんからだ' },
          { text: 'あなたは訊く。それは、譲ったということですか。' },
          { speaker: '親方', text: 'ちがう。合わせただけだ' },
          { speaker: '親方', text: '譲ったんなら、こんなに長くは織れんよ' },
          { text: '親方の灯は、少しも揺れなかった。' },
        ],
        grants: ['f-autonomy', 'f-respect'],
      },
    ],
  },
  {
    id: 'well',
    name: '井戸',
    x: 76,
    y: 30,
    arrival: [
      { text: '井戸は深く、底は見えない。' },
      { text: 'ここまで来ると、機の音も笑い声も届かない。' },
    ],
    links: ['square'],
    talks: [
      {
        id: 't-echo',
        label: '井戸を覗き込む',
        lines: [
          { text: '声を落とすと、自分の声だけが返ってくる。' },
          { text: '誰にも合わせなくてよい。誰にも認められなくてよい。' },
          { text: 'ここでは、灯がいちばん静かに燃える。' },
          { text: 'これを幸福と呼んでいいのだと、あなたは思う。' },
          { text: 'ただ、ずっとここにいた人を、あなたは一人も知らない。' },
        ],
        grants: ['f-solitude'],
      },
    ],
  },
];
