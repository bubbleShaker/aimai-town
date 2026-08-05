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
      { text: '板には、二つの言葉が彫られている。' },
      /* まだ拾っていない断片も突きつけられるので、「聞いた」とは言い切らない */
      { text: 'どちらも、この町のどこかで言われたものだ。' },
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
      'f-bonding': {
        lines: [
          { speaker: '戸', text: 'ここで用のない話をする者はおらん' },
          { text: '機の音は、ひとつも途切れていない。' },
          { speaker: '戸', text: 'それでも、織り目は合っている' },
          { speaker: '戸', text: '近づかずに合わせる手が、ここにはある' },
          { text: '戸は開いた。手を止めた者は、やはりいない。' },
        ],
        shift: { distance: 1, certainty: 0 },
      },
      'f-noise': {
        lines: [
          { speaker: '戸', text: '外から聞いていた、ということか' },
          { text: '機の音は、確かに広場まで届いていた。' },
          { speaker: '戸', text: '音だけでは、手は動かんぞ' },
          { text: '戸は開いた。中では、誰も外を見ていない。' },
        ],
        shift: { distance: -1, certainty: -1 },
      },
      'f-cannot-alone': {
        lines: [
          { speaker: '戸', text: '橋の言葉を、機の前で言うか' },
          { text: 'あなたは言う。布も、着る人がいて布になる。' },
          { speaker: '戸', text: 'では、織っているあいだのそれは何だ' },
          { text: '答えの出ないうちに、戸は開いた。' },
        ],
        shift: { distance: 1, certainty: 0 },
      },
      'f-keeper': {
        lines: [
          { speaker: '戸', text: '足りている者が、なぜ機を回す' },
          { text: '機の音は、答えのように続いている。' },
          { speaker: '戸', text: '……足りていても、手は動くか' },
          { text: '戸は開いた。誰も振り向かなかった。' },
        ],
        shift: { distance: -1, certainty: 1 },
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
  {
    id: 'g-chat',
    name: '裏へ抜ける戸',
    beyond: 'tavern-back',
    tension: ['f-empty-time', 'f-bonding'],
    prologue: [
      { text: '裏へ抜ける戸は、建て付けが悪い。' },
      { text: '框に、紙が二枚挟まっている。' },
      { text: 'どちらも、この町のどこかで書かれたものだ。' },
      { speaker: '戸', text: 'こちらは静かだぞ' },
      { speaker: '戸', text: '出ていくのなら、置いていくものがある' },
    ],
    responses: {
      'f-empty-time': {
        lines: [
          { speaker: '戸', text: 'では、いま出ていくのは正しいな' },
          { text: 'あなたは頷きかけて、背中で笑い声を聞く。' },
          { speaker: '戸', text: '空虚なものを、ずいぶん長く聞いていたが' },
          { text: '戸は、建て付けの悪い音を立てて開いた。' },
        ],
        shift: { distance: -1, certainty: 1 },
      },
      'f-bonding': {
        lines: [
          { speaker: '戸', text: '近くなって、それからどうする' },
          { text: 'あなたは答えない。その先は、誰からも聞いていない。' },
          { speaker: '戸', text: '……まあ、いい' },
          { speaker: '戸', text: '用のない話に行き先を訊くのは、野暮だな' },
          { text: '戸は、押す前にもう開いていた。' },
        ],
        shift: { distance: 2, certainty: -1 },
      },
      'f-approval': {
        lines: [
          { speaker: '戸', text: '灯を卓の真ん中へ寄せるのは、そのためか' },
          { text: '混ざった灯のどれが誰のものか、もう分からない。' },
          { speaker: '戸', text: '寄せたものは、返ってこんぞ' },
          { text: '戸がきしみ、外の冷たい空気が入ってきた。' },
        ],
        shift: { distance: 1, certainty: -1 },
      },
      'f-autonomy': {
        lines: [
          { speaker: '戸', text: 'ここで、その手は何をしていた' },
          { text: 'あなたは思い出す。杯を持っていただけだ。' },
          { speaker: '戸', text: '預けもせず、使いもせずか' },
          { speaker: '戸', text: 'それを休みと呼ぶ者もいる' },
          { text: '戸が開いた。' },
        ],
        shift: { distance: -1, certainty: 0 },
      },
      'f-respect': {
        lines: [
          { speaker: '戸', text: '酒の席でも、合わせていたのか' },
          { text: '笑うところで笑ったことを、あなたは思い出す。' },
          { speaker: '戸', text: '合わせたのか、合ったのか' },
          { text: '答えを待たずに、戸は開いた。' },
        ],
        shift: { distance: 1, certainty: -1 },
      },
      'f-solitude': {
        lines: [
          { speaker: '戸', text: 'では、なぜ卓に着いた' },
          { text: 'あなたは言う。近くにいただけだ。' },
          { speaker: '戸', text: '満ちている者は、近くにいる必要もあるまい' },
          { text: '戸は開いた。裏手の空気は、確かに静かだった。' },
        ],
        shift: { distance: -2, certainty: 0 },
      },
      'f-cloth': {
        lines: [
          { speaker: '戸', text: '布の話を、ここへ持ってきたか' },
          { text: 'あなたは言う。この店の話も、同じ形をしている。' },
          { speaker: '戸', text: '一人では話せぬ、ということか' },
          { speaker: '戸', text: '……なるほど。それは持って出ろ' },
          { text: '戸は、思ったより軽く開いた。' },
        ],
        shift: { distance: 1, certainty: 1 },
      },
      'f-cannot-alone': {
        lines: [
          { speaker: '戸', text: '橋の言葉だな。ここにも通る' },
          { text: 'あなたは、卓に残してきた杯を思い出す。' },
          { speaker: '戸', text: '出ていく先が無ければ、これはただの壁だ' },
          { text: '戸が開き、裏手の暗さが見えた。' },
        ],
        shift: { distance: 1, certainty: 0 },
      },
      'f-keeper': {
        lines: [
          { speaker: '戸', text: '足りている者が、この卓に着いていたか' },
          { text: 'あなたは、灯台の話を誰にもしていない。' },
          { speaker: '戸', text: 'そういう者ほど、長く話す' },
          { text: '戸は開いた。裏手には、聞く者もいない。' },
        ],
        shift: { distance: -1, certainty: 0 },
      },
    },
    fallback: {
      lines: [
        { speaker: '戸', text: '妙なものを、框に挟んでいったな' },
        { speaker: '戸', text: 'まあ、先の二枚もずいぶん古い' },
        { text: '戸は、建て付けの悪い音を立てて開いた。' },
      ],
      shift: { distance: 0, certainty: 0 },
    },
  },
  {
    id: 'g-happiness',
    name: '灯台の戸',
    beyond: 'lighthouse',
    tension: ['f-solitude', 'f-cannot-alone'],
    prologue: [
      { text: '橋を渡り切ると、戸がひとつ立っている。' },
      { text: '錆びた板に、二つの言葉が残っている。' },
      { speaker: '戸', text: 'この先には、誰もおらん' },
      { speaker: '戸', text: 'それでも行くなら、その間に一枚置け' },
    ],
    responses: {
      'f-solitude': {
        lines: [
          { speaker: '戸', text: 'ならば、なぜここまで歩いてきた' },
          { text: 'あなたは言う。確かめに来た。' },
          { speaker: '戸', text: '確かめる相手が、要るのだな' },
          { text: '戸は開いた。風の音だけが残った。' },
        ],
        shift: { distance: -2, certainty: 1 },
      },
      'f-cannot-alone': {
        lines: [
          { speaker: '戸', text: 'では、この橋の先には何がある' },
          { text: 'あなたは、高いところの火を見上げる。' },
          { speaker: '戸', text: '灯は、見る者がいるから灯なのか' },
          { speaker: '戸', text: '……守は、そうは言うまいがな' },
          { text: '戸が開いた。' },
        ],
        shift: { distance: 2, certainty: 0 },
      },
      'f-approval': {
        lines: [
          { speaker: '戸', text: 'その火を、ここまで持ってきたか' },
          { text: '灯台の火は、あなたの灯よりずっと大きい。' },
          { speaker: '戸', text: '大きい火は、誰にも消させんぞ' },
          { text: '戸は、思いのほか静かに開いた。' },
        ],
        shift: { distance: 1, certainty: -1 },
      },
      'f-empty-time': {
        lines: [
          { speaker: '戸', text: 'ここには、用事がひとつも無い' },
          { text: '波の音は、数えられるほど間が空いている。' },
          { speaker: '戸', text: '空虚だと言うなら、引き返せ' },
          { text: 'あなたは引き返さなかった。戸が開いた。' },
        ],
        shift: { distance: -1, certainty: -1 },
      },
      'f-autonomy': {
        lines: [
          { speaker: '戸', text: 'その手で、誰の灯も点けずに済むか' },
          { text: 'あなたは答えず、手のひらを見る。' },
          { speaker: '戸', text: '守は、毎晩ひとつだけ点けている' },
          { text: '戸が開いた。' },
        ],
        shift: { distance: -1, certainty: 1 },
      },
      'f-respect': {
        lines: [
          { speaker: '戸', text: 'ここに、隣は無いぞ' },
          { text: '霧のせいで、向こう岸も見えない。' },
          { speaker: '戸', text: '合わせる相手が消えたとき、手はどう動く' },
          { text: '答えの代わりに、戸が開いた。' },
        ],
        shift: { distance: 1, certainty: -1 },
      },
      'f-cloth': {
        lines: [
          { speaker: '戸', text: 'その布を、ここで着るのか' },
          { text: '風は冷たく、布は確かに厚い。' },
          { speaker: '戸', text: '織った者は、ここにはおらんな' },
          { text: '戸は開いた。布は、あなたの肩にある。' },
        ],
        shift: { distance: 1, certainty: 0 },
      },
      'f-bonding': {
        lines: [
          { speaker: '戸', text: '守は、話し相手を欲しがらん' },
          { speaker: '戸', text: '……本人は、そう言っている' },
          { text: '上から、独り言にしては長い声が降りてくる。' },
          { text: '戸は、いつのまにか開いていた。' },
        ],
        shift: { distance: 2, certainty: -1 },
      },
      'f-noise': {
        lines: [
          { speaker: '戸', text: 'ここまで来ると、町の音は届かん' },
          { text: '耳を澄ませても、水の音しかしない。' },
          { speaker: '戸', text: 'それでも、聞こえるつもりでいるのか' },
          { text: '戸が開いた。風だけが、確かに鳴っている。' },
        ],
        shift: { distance: -2, certainty: -1 },
      },
    },
    fallback: {
      lines: [
        { speaker: '戸', text: 'こんなところまで、それを持ってきたか' },
        { speaker: '戸', text: '板の字は、もう読めぬがな' },
        { text: '戸は、風に押されるように開いた。' },
      ],
      shift: { distance: 0, certainty: 0 },
    },
  },
];
