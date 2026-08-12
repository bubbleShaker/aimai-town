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
      'f-step-out': {
        lines: [
          { speaker: '戸', text: 'ここから出ていく話か' },
          { text: '機の音は、あなたの返事を待っていない。' },
          { speaker: '戸', text: '手を止めた者から、先に出ていく' },
          { speaker: '戸', text: '……出ていった者も、朝には戻る' },
          { text: '機の音のあいだに、戸が開いた。' },
        ],
        shift: { distance: -1, certainty: 0 },
      },
      'f-borrowed-fire': {
        lines: [
          { speaker: '戸', text: 'その手つきは、誰に教わった' },
          { text: 'あなたは、親方の指の運びを思い出す。' },
          { speaker: '戸', text: '借りた手つきで、自分の布を織るわけだ' },
          { text: '戸は開いた。機の音は変わらない。' },
        ],
        shift: { distance: 1, certainty: 1 },
      },
      'f-interrupt': {
        lines: [
          { speaker: '戸', text: 'ここでは、誰も話しかけてこなかったろう' },
          { text: '機の音は、ひとつも途切れていない。' },
          { speaker: '戸', text: '手が動いているあいだ、声はかけぬのが作法だ' },
          { speaker: '戸', text: '……そのぶん、ここでは何も始まらん' },
          { text: '戸は開いた。手を止めた者はいない。' },
        ],
        shift: { distance: -1, certainty: 0 },
      },
      'f-drawn-out': {
        lines: [
          { speaker: '戸', text: '親方に、何か訊いたか' },
          { text: 'あなたは思い出す。譲ったのか、と訊いた。' },
          { speaker: '戸', text: 'あれは、捻り出した問いではなかったろう' },
          { speaker: '戸', text: '手を見ていれば、訊きたいことは湧く' },
          { text: '戸が開いた。手は、まだ動いている。' },
        ],
        shift: { distance: 1, certainty: 0 },
      },
      'f-chosen-place': {
        lines: [
          { speaker: '戸', text: 'では、ここは選んで来たのか' },
          { text: 'あなたは答えない。用があって入ったわけではない。' },
          { speaker: '戸', text: 'ここで生まれるのは、話ではなく布だ' },
          { speaker: '戸', text: '……それでも、隣とは合っている' },
          { text: '戸は開いた。誰も顔を上げなかった。' },
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
      'f-step-out': {
        lines: [
          { speaker: '戸', text: 'それは、いまのおまえのことだな' },
          { text: '声の塊が、いちど大きくなった。' },
          { speaker: '戸', text: '出ていく者は、たいてい戻ってくる' },
          { speaker: '戸', text: '……火の消える分だけ、外にいる' },
          { text: '戸は、押した分だけきしんで開いた。' },
        ],
        shift: { distance: -1, certainty: 0 },
      },
      'f-borrowed-fire': {
        lines: [
          { speaker: '戸', text: 'ここでは、火を借りる必要もない' },
          { text: '卓の上では、灯がひとつに寄せられている。' },
          { speaker: '戸', text: '借りるのと、寄せるのは同じか' },
          { text: '戸が開くと、寄せた灯が少しだけ揺れた。' },
        ],
        shift: { distance: 1, certainty: -1 },
      },
      'f-interrupt': {
        lines: [
          { speaker: '戸', text: 'この店で、途切れた考えがあったか' },
          { text: '声の塊は、誰の話も最後まで聞いていない。' },
          { speaker: '戸', text: 'ここでは、途切れることが話の続き方だ' },
          { speaker: '戸', text: '……途切れて困る考えは、外へ持って出ろ' },
          { text: '戸は、建て付けの悪い音を立てて開いた。' },
        ],
        shift: { distance: -1, certainty: -1 },
      },
      'f-drawn-out': {
        lines: [
          { speaker: '戸', text: 'ここで、問いを捻り出した者はおらん' },
          { text: '卓では、答えのいらない話ばかりが続いている。' },
          { speaker: '戸', text: '捻り出すのは、相手が遠いからだ' },
          { speaker: '戸', text: '……近ければ、そもそも問わずに済む' },
          { text: '戸は、押す前に少し開いていた。' },
        ],
        shift: { distance: 1, certainty: 0 },
      },
      'f-chosen-place': {
        lines: [
          { speaker: '戸', text: 'では、この店は選んで入ったな' },
          { text: 'あなたは、戸を押したときのことを思い出す。' },
          { speaker: '戸', text: 'ここは、選んで入った者ばかりだ' },
          { speaker: '戸', text: 'それでも、始まる話は選べんぞ' },
          { text: '戸が開き、外の冷たい空気が入ってきた。' },
        ],
        shift: { distance: 1, certainty: -1 },
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
      'f-step-out': {
        lines: [
          { speaker: '戸', text: 'この先は、離れる一方だぞ' },
          { text: '橋の向こうからは、風の音しかしない。' },
          { speaker: '戸', text: '……守も、そう言ってここへ来た' },
          { text: '戸は開いた。火は、まだ高いところにある。' },
        ],
        shift: { distance: -2, certainty: 0 },
      },
      'f-borrowed-fire': {
        lines: [
          { speaker: '戸', text: 'その火は、どこで点けた' },
          { text: 'あなたは、屋根の下の煙を思い出す。' },
          { speaker: '戸', text: '借りた火で、ここまで歩いてきたわけだ' },
          { speaker: '戸', text: '……この先は、風が強いぞ' },
          { text: '戸が開き、風がまっすぐ吹き込んだ。' },
        ],
        shift: { distance: 1, certainty: -1 },
      },
      'f-interrupt': {
        lines: [
          { speaker: '戸', text: 'この先には、途切れさせる者もおらん' },
          { text: '風の音のほかに、聞こえるものは何も無い。' },
          { speaker: '戸', text: '守の考えは、何年も途切れていないわけだ' },
          { speaker: '戸', text: '……それを、静かと呼ぶかどうかだな' },
          { text: '戸は、風に押されて開いた。' },
        ],
        shift: { distance: -1, certainty: -1 },
      },
      'f-drawn-out': {
        lines: [
          { speaker: '戸', text: '守に、何を訊くつもりだ' },
          { text: '橋を渡り切っても、まだ何も浮かんでいない。' },
          { speaker: '戸', text: '足りている者への問いは、たいてい捻り出しになる' },
          { speaker: '戸', text: '……それでも、守は長く答えるぞ' },
          { text: '戸が開いた。上の火は、まだ大きい。' },
        ],
        shift: { distance: 1, certainty: -1 },
      },
      'f-chosen-place': {
        lines: [
          { speaker: '戸', text: 'この先は、話の生まれる場所ではないぞ' },
          { text: 'あなたは、それを知って橋を渡ってきた。' },
          { speaker: '戸', text: '生まれぬと知って来る者も、たまにいる' },
          { speaker: '戸', text: '守は、そういう者にだけよく話す' },
          { text: '戸は、風に押されるように開いた。' },
        ],
        shift: { distance: -1, certainty: 0 },
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
