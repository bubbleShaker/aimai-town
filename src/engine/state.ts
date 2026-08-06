import type {
  AxisShift,
  Ending,
  EndingId,
  Fragment,
  FragmentId,
  Gate,
  GateId,
  GateResponse,
  Place,
  PlaceId,
  Talk,
  TalkId,
  World,
} from '../scenario/types';

/**
 * ゲームの進行状態。
 * 「今どの画面か」「対話の何行目か」といった表示の都合は、ここには入れない。
 * ここに入るのは、セーブして復元したときに世界が同じ姿になるものだけ。
 */
export interface GameState {
  currentPlaceId: PlaceId;
  /** 訪れたことのある場所 */
  visitedPlaceIds: PlaceId[];
  /** 手に入れた断片。獲得順を保つ */
  fragmentIds: FragmentId[];
  /** 一度終えた対話 */
  finishedTalkIds: TalkId[];
  /** 開いた扉 */
  openedGateIds: GateId[];
  /**
   * 扉に何を差し出したかの記録。
   * 集計した軸の値ではなく選択そのものを持つ。
   * 軸の重みを後から変えても、記録した選択の意味が変わらないようにするため。
   */
  gateChoices: GateChoice[];
}

export interface GateChoice {
  gateId: GateId;
  fragmentId: FragmentId;
}

export type GameAction =
  | { type: 'MOVE'; to: PlaceId }
  | { type: 'FINISH_TALK'; talkId: TalkId }
  | { type: 'OPEN_GATE'; gateId: GateId; fragmentId: FragmentId };

export function createInitialState(world: World): GameState {
  return {
    currentPlaceId: world.start,
    visitedPlaceIds: [world.start],
    fragmentIds: [],
    finishedTalkIds: [],
    openedGateIds: [],
    gateChoices: [],
  };
}

/**
 * まだ何もしていない状態か。歩いてもいない、話してもいない、戸も開けていない。
 * 保存する意味の無い状態を見分けるのに使う（残しても、次に始まる場所は同じため）。
 */
export function isUntouched(world: World, state: GameState): boolean {
  return (
    state.currentPlaceId === world.start &&
    state.visitedPlaceIds.length <= 1 &&
    state.fragmentIds.length === 0 &&
    state.finishedTalkIds.length === 0 &&
    state.openedGateIds.length === 0 &&
    state.gateChoices.length === 0
  );
}

export function findPlace(world: World, id: PlaceId): Place | undefined {
  return world.places.find((p) => p.id === id);
}

/** 今いる場所で話しかけられる相手だけを引く */
export function findTalk(world: World, state: GameState, talkId: TalkId): Talk | undefined {
  return findPlace(world, state.currentPlaceId)?.talks.find((t) => t.id === talkId);
}

export function findGate(world: World, id: GateId): Gate | undefined {
  return world.gates.find((g) => g.id === id);
}

/** その場所へ入るために開かねばならない扉 */
export function gateGuarding(world: World, placeId: PlaceId): Gate | undefined {
  return world.gates.find((g) => g.beyond === placeId);
}

/** 今いる場所の目の前にある、まだ開いていない扉 */
export function gatesAhead(world: World, state: GameState): Gate[] {
  const place = findPlace(world, state.currentPlaceId);
  if (!place) return [];
  return place.links
    .map((to) => gateGuarding(world, to))
    .filter((g): g is Gate => g !== undefined && !state.openedGateIds.includes(g.id));
}

/** 町の扉をすべて開いたか。終幕はこれを満たすまで開かない */
export function allGatesOpened(world: World, state: GameState): boolean {
  return world.gates.every((g) => state.openedGateIds.includes(g.id));
}

/**
 * いま入れない場所か。閉じた扉の向こうと、条件の満たない終幕をまとめて指す。
 * 「閉ざされている」の描き分けを UI が自前で組み立てずに済むよう、ここに置く。
 */
export function isSealed(world: World, state: GameState, placeId: PlaceId): boolean {
  if (placeId === world.finale) return !allGatesOpened(world, state);
  const gate = gateGuarding(world, placeId);
  return gate !== undefined && !state.openedGateIds.includes(gate.id);
}

/**
 * そこへ歩けるか。UI 側の不備でルールが破られないよう、判定はここに一本化する。
 * 扉の向こうへは、その扉を開くまで行けない。
 */
export function canMove(world: World, state: GameState, to: PlaceId): boolean {
  const place = findPlace(world, state.currentPlaceId);
  if (!place) return false;
  if (!findPlace(world, to)) return false;
  if (!place.links.includes(to)) return false;
  return !isSealed(world, state, to);
}

/**
 * その扉に差し出せる断片。いまは手持ちがそのまま候補になる。
 * 扉ごとに置ける／置けないの規則が要るとき、ここだけを変えれば済むよう gate を受けておく。
 */
export function offerableFragments(world: World, state: GameState, _gate: Gate): Fragment[] {
  return collectedFragments(world, state);
}

/** 扉が突きつける二枚を、実体で取り出す */
export function gateTension(world: World, gate: Gate): Fragment[] {
  return gate.tension.map((id) => findFragment(world, id)).filter((f): f is Fragment => f !== undefined);
}

/** 差し出された断片に対して扉が返すもの。書かれていない断片には共通の返答を使う */
export function gateResponse(gate: Gate, fragmentId: FragmentId): GateResponse {
  return gate.responses[fragmentId] ?? gate.fallback;
}

/**
 * 状態遷移。副作用を持たない純粋関数にしてあるので、そのままテストできる。
 * 不正な行動は例外にせず「何も起きなかった」ことにして、同じ state を返す。
 */
export function reduce(state: GameState, action: GameAction, world: World): GameState {
  switch (action.type) {
    case 'MOVE': {
      if (!canMove(world, state, action.to)) return state;
      return {
        ...state,
        currentPlaceId: action.to,
        visitedPlaceIds: addUnique(state.visitedPlaceIds, action.to),
      };
    }
    case 'FINISH_TALK': {
      const talk = findTalk(world, state, action.talkId);
      // その場に無い対話は成立しない
      if (!talk) return state;
      return {
        ...state,
        finishedTalkIds: addUnique(state.finishedTalkIds, talk.id),
        fragmentIds: talk.grants.reduce((acc, id) => addUnique(acc, id), state.fragmentIds),
      };
    }
    case 'OPEN_GATE': {
      const gate = gatesAhead(world, state).find((g) => g.id === action.gateId);
      // 目の前に無い扉、すでに開いた扉には触れない
      if (!gate) return state;
      // 持っていない断片は差し出せない
      if (!state.fragmentIds.includes(action.fragmentId)) return state;
      // 扉は二度開かない（gatesAhead が開いた扉を除いている）ので、
      // gateChoices には扉ごとに高々一件しか積まれない。M3 の集計はこれを前提にする
      return {
        ...state,
        openedGateIds: addUnique(state.openedGateIds, gate.id),
        gateChoices: [...state.gateChoices, { gateId: gate.id, fragmentId: action.fragmentId }],
      };
    }
    default:
      return state;
  }
}

/** その対話でこれから新しく手に入る断片。すでに持っているものは除く */
export function pendingGrants(world: World, state: GameState, talkId: TalkId): Fragment[] {
  const talk = findTalk(world, state, talkId);
  if (!talk) return [];
  return talk.grants
    .filter((id) => !state.fragmentIds.includes(id))
    .map((id) => findFragment(world, id))
    .filter((f): f is Fragment => f !== undefined);
}

/** 集めた断片を、獲得順に実体で取り出す */
export function collectedFragments(world: World, state: GameState): Fragment[] {
  return state.fragmentIds
    .map((id) => findFragment(world, id))
    .filter((f): f is Fragment => f !== undefined);
}

/**
 * 扉に置いてきた一枚ずつを、そのつど軸に畳んだもの。
 * GameState には持たせない導出値にしてある。集計ではなく選択そのものを記録しておけば、
 * 軸の重み（shift）を後から書き換えても、過去の記録の意味が変わらないため。
 */
export function axes(world: World, state: GameState): AxisShift {
  return state.gateChoices.reduce<AxisShift>(
    (sum, choice) => {
      const gate = findGate(world, choice.gateId);
      if (!gate) return sum;
      const { shift } = gateResponse(gate, choice.fragmentId);
      return {
        distance: sum.distance + shift.distance,
        certainty: sum.certainty + shift.certainty,
      };
    },
    { distance: 0, certainty: 0 },
  );
}

/**
 * 戸の前でしたことを、一件ずつ実体に開いたもの。
 * gateChoices は id しか持たないので、読み返すための形に起こすのはここでやる。
 * UI が id から引き直して失敗する経路を作らないため、実体で返す。
 *
 * 並びは開いた順。歩いた順にそのまま読める。
 * 消えた扉や断片を指す記録は落とす（世界データを書き換えても画面が壊れないようにする）。
 */
export function trace(world: World, state: GameState): GateTrace[] {
  return state.gateChoices.flatMap((choice) => {
    const gate = findGate(world, choice.gateId);
    const offered = findFragment(world, choice.fragmentId);
    if (!gate || !offered) return [];
    return [
      {
        gate: { id: gate.id, name: gate.name },
        tension: gateTension(world, gate),
        offered,
        // 突きつけられた二枚のどちらでもない一枚を置いたなら、間に橋を架けたことになる
        bridged: !gate.tension.includes(offered.id),
      },
    ];
  });
}

/**
 * 軌跡に出す戸。名だけを持ち、Gate そのものは渡さない。
 * Gate は返答ごとの軸の値（shift）を抱えているので、そのまま画面へ流すと
 * 「プレイヤーには数値を見せない」が型の上で守られなくなる。
 */
export interface TracedGate {
  id: GateId;
  name: string;
}

/** 戸ひとつ分の軌跡。集計ではなく、その場で何を突きつけられ、何を置いたか */
export interface GateTrace {
  gate: TracedGate;
  /** 突きつけられた二枚 */
  tension: Fragment[];
  /** 実際に置いた一枚 */
  offered: Fragment;
  /** 間に第三の一枚を架けたか。偽なら、突きつけられた片方をそのまま置いた */
  bridged: boolean;
}

/**
 * 矛盾を矛盾のまま抱えてきたか。
 * 町の言葉をすべて拾ったうえで、どの戸の前でも「間に架ける第三の一枚」を出さず、
 * 突きつけられた二枚のうちの片方をそのまま置いた場合を指す。
 */
export function heldContradiction(world: World, state: GameState): boolean {
  if (!world.fragments.every((f) => state.fragmentIds.includes(f.id))) return false;
  if (!allGatesOpened(world, state)) return false;
  const walked = trace(world, state);
  // 「架けなかった」の判定は trace に一本化する。エンドロールと終幕で読みが割れないようにするため。
  // 数えるのは記録の件数ではなく町の戸の数。記録の側が欠けていたとき、
  // 欠けたぶんだけ「架けなかった」と見なしてしまわないようにする
  // （欠けた記録は読み戻しで落ちることがある。engine/restore を参照）
  return walked.length === world.gates.length && walked.every((t) => !t.bridged);
}

/**
 * どの終幕を引くか。
 * 優劣ではなく、どこへ振れたかで分ける。振れなかったこと（0）もひとつの終幕として持つ。
 *
 * 境界を専用のエンドに逃がしてあるのは、「孤独でも関わりでもなかった」を孤独の側に
 * 丸めないため。どちらの軸で止まっても同じ終幕へ行くので、
 * その文では止まった軸を名指ししない（endings.ts の e-halfway を参照）。
 *
 * 終幕の場所まで歩けた状態、つまり扉をすべて開いた状態で呼ばれることを前提にしている。
 * 途中の状態で呼ぶと、まだ振れていない軸が 0 のまま e-halfway が返る。
 */
export function resolveEndingId(world: World, state: GameState): EndingId {
  if (heldContradiction(world, state)) return 'e-nameless';
  return endingOfAxes(axes(world, state));
}

/**
 * 振れた向きだけで決まる終幕。
 * 矛盾を抱えたままの一つは軸では決まらないので、resolveEndingId が先に見ている。
 */
export function endingOfAxes({ distance, certainty }: AxisShift): EndingId {
  if (distance === 0 || certainty === 0) return 'e-halfway';
  if (distance < 0) return certainty > 0 ? 'e-lighthouse' : 'e-fog';
  return certainty > 0 ? 'e-weaver' : 'e-square';
}

/** 終幕そのもの。endings は EndingId をすべて埋めた Record なので、必ず実体が返る */
export function resolveEnding(world: World, state: GameState): Ending {
  return world.endings[resolveEndingId(world, state)];
}

/** 双方向の道を一本ずつに畳んだもの。マップを描くための導出値 */
export function roads(world: World): [PlaceId, PlaceId][] {
  const seen = new Set<string>();
  const result: [PlaceId, PlaceId][] = [];
  for (const place of world.places) {
    for (const to of place.links) {
      const key = [place.id, to].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      result.push([place.id, to]);
    }
  }
  return result;
}

export function findFragment(world: World, id: FragmentId): Fragment | undefined {
  return world.fragments.find((f) => f.id === id);
}

/** 既に含まれていれば元の配列をそのまま返す（無駄な再描画を避けるため参照を変えない） */
function addUnique<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list : [...list, value];
}
