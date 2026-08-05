import type { Fragment, FragmentId, Place, PlaceId, TalkId, World } from '../scenario/types';

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

/** 隣接していない場所へは歩けない。UI 側の不備でルールが破られないよう、ここで判定する */
export function canMove(world: World, from: PlaceId, to: PlaceId): boolean {
  const place = findPlace(world, from);
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
      if (!canMove(world, state.currentPlaceId, action.to)) return state;
      return {
        ...state,
        currentPlaceId: action.to,
        visitedPlaceIds: addUnique(state.visitedPlaceIds, action.to),
      };
    }
    case 'FINISH_TALK': {
      const place = findPlace(world, state.currentPlaceId);
      const talk = place?.talks.find((t) => t.id === action.talkId);
      // その場に無い対話は成立しない
      if (!talk) return state;
      return {
        ...state,
        finishedTalkIds: addUnique(state.finishedTalkIds, talk.id),
        fragmentIds: talk.grants.reduce(addUnique, state.fragmentIds),
      };
    }
    default:
      return state;
  }
}

/** 集めた断片を、獲得順に実体で取り出す */
export function collectedFragments(world: World, state: GameState): Fragment[] {
  return state.fragmentIds
    .map((id) => world.fragments.find((f) => f.id === id))
    .filter((f): f is Fragment => f !== undefined);
}

/** 既に含まれていれば元の配列をそのまま返す（無駄な再描画を避けるため参照を変えない） */
function addUnique<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list : [...list, value];
}
