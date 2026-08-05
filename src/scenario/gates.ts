import type { Gate } from './types';

/**
 * 扉。
 * どの断片を差し出しても開くのが、この作品の作法。
 * 「開かない選択肢」を作ると、答えが一つに収束するという嘘になる。
 * 変わるのは、扉が返す言葉と、記録される軸だけ。
 */
export const gates: Gate[] = [
  {
    id: 'g-work',
    name: '機屋の奥へ続く戸',
    beyond: 'loom-inner',
    tension: ['f-autonomy', 'f-respect'],
    prologue: [
      { text: '奥へ続く戸は、閉じている。' },
      { text: '板には二つの言葉が彫られている。どちらも、この町で聞いた言葉だ。' },
      { speaker: '戸', text: 'どちらも本当だと言うのなら' },
      { speaker: '戸', text: 'その間に、もう一枚を置いてみせろ' },
    ],
    responses: {
      'f-autonomy': {
        lines: [
          { speaker: '戸', text: 'では、合わせることは何だ' },
          { text: 'あなたは答えない。答えの代わりに、親方の手つきを思い出す。' },
          { speaker: '戸', text: '預けずに、合わせている手がある、ということか' },
          { speaker: '戸', text: 'よかろう。それは、まだ言葉になっていない' },
        ],
        shift: { distance: -1, certainty: 1 },
      },
      'f-respect': {
        lines: [
          { speaker: '戸', text: 'では、おまえの手はどこへ行った' },
          { text: 'あなたは言う。合わせているのも、自分の手だ。' },
          { speaker: '戸', text: '……その言い方は、ずるいな' },
          { speaker: '戸', text: 'だが、布は確かに織り上がっている' },
        ],
        shift: { distance: 1, certainty: 1 },
      },
      'f-approval': {
        lines: [
          { speaker: '戸', text: '合わせるのは、認められたいからだと' },
          { speaker: '戸', text: '火は、燃やせば温かい。だが消えるときは、たいてい他人が消す' },
          { text: 'あなたはそれを知っている。知っていて、まだ燃やしている。' },
        ],
        shift: { distance: 1, certainty: -1 },
      },
      'f-empty-time': {
        lines: [
          { speaker: '戸', text: 'ここは仕事場だ。目的ならある' },
          { speaker: '戸', text: '目的があるあいだは、矛盾は起きぬ、と' },
          { speaker: '戸', text: '……では、目的が終わったあとの時間を、おまえはどうする' },
          { text: '問いは返されたまま、戸は開いた。' },
        ],
        shift: { distance: -1, certainty: -1 },
      },
      'f-solitude': {
        lines: [
          { speaker: '戸', text: 'では、なぜ機の前に立っている' },
          { text: 'あなたは言う。布を織るためだ。' },
          { speaker: '戸', text: '布は、誰かが着るために織るのだろう' },
          { text: '戸は静かに開いた。答えを待ってはいなかった。' },
        ],
        shift: { distance: -2, certainty: 1 },
      },
    },
    fallback: {
      lines: [
        { speaker: '戸', text: 'それを、ここに置くのか' },
        { speaker: '戸', text: '置いたものは、置いた本人にしか見えぬ形をしている' },
        { text: '戸はきしみながら開いた。' },
      ],
      shift: { distance: 0, certainty: 0 },
    },
  },
];
