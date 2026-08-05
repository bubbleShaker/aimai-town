import type { Fragment, FragmentId, Place, PlaceId, Talk, TalkId, World } from '../scenario/types';

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
}

export type GameAction =
  | { type: 'MOVE'; to: PlaceId }
  | { type: 'FINISH_TALK'; talkId: TalkId };

export function createInitialState(world: World): GameState {
  return {
    currentPlaceId: world.start,
    visitedPlaceIds: [world.start],
    fragmentIds: [],
    finishedTalkIds: [],
  };
}

export function findPlace(world: World, id: PlaceId): Place | undefined {
  return world.places.find((p) => p.id === id);
}

/** 今いる場所で話しかけられる相手だけを引く */
export function findTalk(world: World, state: GameState, talkId: TalkId): Talk | undefined {
  return findPlace(world, state.currentPlaceId)?.talks.find((t) => t.id === talkId);
}

/**
 * そこへ歩けるか。UI 側の不備でルールが破られないよう、判定はここに一本化する。
 * 状態そのものを受け取る形にしてあるのは、扉の解錠など「持ち物によって通れる道が変わる」
 * 条件を、UI を触らずにこの関数の中だけで足せるようにするため。
 */
export function canMove(world: World, state: GameState, to: PlaceId): boolean {
  const place = findPlace(world, state.currentPlaceId);
  if (!place) return false;
  if (!findPlace(world, to)) return false;
  return place.links.includes(to);
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

function findFragment(world: World, id: FragmentId): Fragment | undefined {
  return world.fragments.find((f) => f.id === id);
}

/** 既に含まれていれば元の配列をそのまま返す（無駄な再描画を避けるため参照を変えない） */
function addUnique<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list : [...list, value];
}
