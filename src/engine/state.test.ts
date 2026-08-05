import { describe, expect, it } from 'vitest';
import { world } from '../scenario';
import type { FragmentId, Gate, PlaceId } from '../scenario/types';
import type { GameState } from './state';
import {
  canMove,
  collectedFragments,
  createInitialState,
  findFragment,
  findGate,
  findPlace,
  gateGuarding,
  gateResponse,
  gatesAhead,
  pendingGrants,
  reduce,
  roads,
} from './state';

describe('createInitialState', () => {
  it('世界の開始地点から始まり、断片は何も持っていない', () => {
    const s = createInitialState(world);
    expect(s.currentPlaceId).toBe(world.start);
    expect(s.visitedPlaceIds).toEqual([world.start]);
    expect(s.fragmentIds).toEqual([]);
  });
});

describe('MOVE', () => {
  it('隣接する場所へは歩ける', () => {
    const s = reduce(createInitialState(world), { type: 'MOVE', to: 'loom' }, world);
    expect(s.currentPlaceId).toBe('loom');
    expect(s.visitedPlaceIds).toContain('loom');
  });

  it('隣接していない場所へは歩けず、状態が変わらない', () => {
    const before = reduce(createInitialState(world), { type: 'MOVE', to: 'loom' }, world);
    // 織り小屋から井戸へは直接つながっていない
    const after = reduce(before, { type: 'MOVE', to: 'well' }, world);
    expect(after).toBe(before);
  });

  it('存在しない場所へは歩けない', () => {
    const before = createInitialState(world);
    expect(reduce(before, { type: 'MOVE', to: 'nowhere' }, world)).toBe(before);
    expect(canMove(world, before, 'nowhere')).toBe(false);
  });
});

describe('FINISH_TALK', () => {
  it('対話を終えると断片が手に入る', () => {
    const s = reduce(createInitialState(world), { type: 'FINISH_TALK', talkId: 't-child' }, world);
    expect(s.fragmentIds).toEqual(['f-approval']);
    expect(s.finishedTalkIds).toEqual(['t-child']);
  });

  it('一度に複数の断片を与える対話がある', () => {
    let s = reduce(createInitialState(world), { type: 'MOVE', to: 'loom' }, world);
    s = reduce(s, { type: 'FINISH_TALK', talkId: 't-master' }, world);
    expect(s.fragmentIds).toEqual(['f-autonomy', 'f-respect']);
  });

  it('同じ対話を繰り返しても断片は重複しない', () => {
    let s = reduce(createInitialState(world), { type: 'FINISH_TALK', talkId: 't-child' }, world);
    s = reduce(s, { type: 'FINISH_TALK', talkId: 't-child' }, world);
    expect(s.fragmentIds).toEqual(['f-approval']);
  });

  it('その場にいない相手とは話せない', () => {
    const before = createInitialState(world);
    // 親方は織り小屋にいる
    expect(reduce(before, { type: 'FINISH_TALK', talkId: 't-master' }, world)).toBe(before);
  });
});

describe('collectedFragments', () => {
  it('獲得順に断片の実体を取り出せる', () => {
    let s = reduce(createInitialState(world), { type: 'FINISH_TALK', talkId: 't-nameless' }, world);
    s = reduce(s, { type: 'FINISH_TALK', talkId: 't-child' }, world);
    expect(collectedFragments(world, s).map((f) => f.id)).toEqual(['f-empty-time', 'f-approval']);
  });
});

describe('pendingGrants', () => {
  it('これから得る断片だけを返す', () => {
    const s = createInitialState(world);
    expect(pendingGrants(world, s, 't-child').map((f) => f.id)).toEqual(['f-approval']);
  });

  it('すでに持っている断片は含まない', () => {
    const s = reduce(createInitialState(world), { type: 'FINISH_TALK', talkId: 't-child' }, world);
    expect(pendingGrants(world, s, 't-child')).toEqual([]);
  });

  it('その場にいない相手の断片は覗けない', () => {
    expect(pendingGrants(world, createInitialState(world), 't-master')).toEqual([]);
  });
});

describe('roads', () => {
  it('双方向の道を一本に畳む', () => {
    const list = roads(world);
    const keys = list.map(([a, b]) => [a, b].sort().join('|'));
    expect(new Set(keys).size).toBe(list.length);
    // 道は双方向に張られているので、畳むとちょうど半分になる
    const totalLinks = world.places.reduce((n, p) => n + p.links.length, 0);
    expect(list.length).toBe(totalLinks / 2);
  });
});

describe('扉', () => {
  /** 織り小屋まで行き、親方から二枚もらった状態 */
  function atLoom() {
    let s = reduce(createInitialState(world), { type: 'MOVE', to: 'loom' }, world);
    s = reduce(s, { type: 'FINISH_TALK', talkId: 't-master' }, world);
    return s;
  }

  it('開くまで、扉の向こうへは歩けない', () => {
    const s = atLoom();
    expect(canMove(world, s, 'loom-inner')).toBe(false);
    expect(reduce(s, { type: 'MOVE', to: 'loom-inner' }, world)).toBe(s);
  });

  it('目の前の扉だけが見える', () => {
    expect(gatesAhead(world, createInitialState(world))).toEqual([]);
    expect(gatesAhead(world, atLoom()).map((g) => g.id)).toEqual(['g-work']);
  });

  it('持っていない断片は差し出せない', () => {
    const s = atLoom();
    expect(reduce(s, { type: 'OPEN_GATE', gateId: 'g-work', fragmentId: 'f-solitude' }, world)).toBe(s);
  });

  it('目の前に無い扉は開けられない', () => {
    const s = reduce(createInitialState(world), { type: 'FINISH_TALK', talkId: 't-child' }, world);
    expect(reduce(s, { type: 'OPEN_GATE', gateId: 'g-work', fragmentId: 'f-approval' }, world)).toBe(s);
  });

  /**
   * どの扉も、そこへ着くまでに拾える一枚ならどれでも開く。
   * 扉を足したら自動で網にかかるよう、世界にある扉すべてを歩いて確かめる。
   * これが落ちたら、仕様ではなく企画（正解を用意しない）が壊れたと考える。
   */
  it('どの断片を差し出しても扉は開き、選択が記録される', () => {
    for (const gate of world.gates) {
      const before = walkTo(gate);
      // 実際に歩いて集めた手札が、机上の「持ちうる断片」と一致することも同時に見る
      expect([...before.fragmentIds].sort()).toEqual([...fragmentsObtainableBefore(gate)].sort());
      expect(gatesAhead(world, before).map((g) => g.id)).toContain(gate.id);

      for (const fragmentId of before.fragmentIds) {
        const after = reduce(before, { type: 'OPEN_GATE', gateId: gate.id, fragmentId }, world);
        expect(after.openedGateIds, `${gate.id} が ${fragmentId} で開かない`).toContain(gate.id);
        expect(after.gateChoices.at(-1)).toEqual({ gateId: gate.id, fragmentId });
        expect(canMove(world, after, gate.beyond)).toBe(true);
      }
    }
  });

  it('一度開いた扉は、二度目の選択を受け付けない', () => {
    let s = reduce(atLoom(), { type: 'OPEN_GATE', gateId: 'g-work', fragmentId: 'f-autonomy' }, world);
    const opened = s;
    s = reduce(s, { type: 'OPEN_GATE', gateId: 'g-work', fragmentId: 'f-respect' }, world);
    expect(s).toBe(opened);
    expect(s.gateChoices).toHaveLength(1);
  });

  /** 広場で一枚拾い、酒場へ移って常連からもう一枚もらった状態 */
  function atTavern() {
    let s = reduce(createInitialState(world), { type: 'FINISH_TALK', talkId: 't-nameless' }, world);
    s = reduce(s, { type: 'MOVE', to: 'tavern' }, world);
    return reduce(s, { type: 'FINISH_TALK', talkId: 't-regular' }, world);
  }

  it('扉は互いに独立していて、片方を開いても他方は閉じたまま', () => {
    const s = reduce(atTavern(), { type: 'OPEN_GATE', gateId: 'g-chat', fragmentId: 'f-bonding' }, world);
    expect(s.openedGateIds).toEqual(['g-chat']);
    expect(canMove(world, s, 'loom-inner')).toBe(false);
  });

  it('扉の向こうと行き来できる', () => {
    let s = reduce(atLoom(), { type: 'OPEN_GATE', gateId: 'g-work', fragmentId: 'f-autonomy' }, world);
    s = reduce(s, { type: 'MOVE', to: 'loom-inner' }, world);
    expect(s.currentPlaceId).toBe('loom-inner');
    s = reduce(s, { type: 'MOVE', to: 'loom' }, world);
    expect(s.currentPlaceId).toBe('loom');
  });

  it('返答が用意されていない断片には、共通の返答が使われる', () => {
    const gate = findGate(world, 'g-work')!;
    expect(gateResponse(gate, 'f-autonomy')).toBe(gate.responses['f-autonomy']);
    expect(gateResponse(gate, 'f-unknown')).toBe(gate.fallback);
  });
});

describe('世界の整合性', () => {
  it('扉が指す場所と断片は、すべて定義済みである', () => {
    for (const gate of world.gates) {
      expect(findPlace(world, gate.beyond), `${gate.id} の行き先が無い`).toBeDefined();
      for (const id of [...gate.tension, ...Object.keys(gate.responses)]) {
        expect(findFragment(world, id), `${gate.id} が未定義の断片 ${id} を指している`).toBeDefined();
      }
    }
  });

  it('扉の向こうへは、その扉を通る道しか無い', () => {
    for (const gate of world.gates) {
      const neighbors = world.places.filter((p) => p.links.includes(gate.beyond));
      expect(neighbors.length, `${gate.beyond} に扉を通らない入口がある`).toBe(1);
    }
  });

  it('扉の id と行き先に重複が無い', () => {
    const ids = world.gates.map((g) => g.id);
    const beyonds = world.gates.map((g) => g.beyond);
    expect(new Set(ids).size, `扉の id が重複している: ${ids.join(', ')}`).toBe(ids.length);
    expect(new Set(beyonds).size, `同じ場所を守る扉が複数ある: ${beyonds.join(', ')}`).toBe(
      beyonds.length,
    );
  });

  it('扉が突きつける二枚は、別の断片である', () => {
    for (const gate of world.gates) {
      expect(gate.tension[0], `${gate.id} が同じ断片を二枚突きつけている`).not.toBe(gate.tension[1]);
    }
  });

  it('扉の前に立つまでに持ちうる断片には、専用の返答が用意されている', () => {
    for (const gate of world.gates) {
      for (const id of fragmentsObtainableBefore(gate)) {
        expect(gate.responses[id], `${gate.id} に ${id} への返答が無い`).toBeDefined();
      }
    }
  });

  it('どの断片にも、それを受け取る扉が少なくともひとつある', () => {
    for (const fragment of world.fragments) {
      const takers = world.gates.filter((g) => g.responses[fragment.id]);
      expect(takers.length, `${fragment.id} は、どの扉にも差し出せない死に札になっている`).toBeGreaterThan(0);
    }
  });

  it('開始地点で、扉を開くための一枚が手に入る', () => {
    // 「他の扉は通れるものとして数える」という上の前提は、これが成り立つことに乗っている
    const granted = findPlace(world, world.start)!.talks.flatMap((t) => t.grants);
    expect(granted.length, '開始地点で断片が手に入らないと、どの扉も開けられない').toBeGreaterThan(0);
  });

  it('扉が突きつける二枚は、その扉に着くまでに手に入る', () => {
    for (const gate of world.gates) {
      const obtainable = fragmentsObtainableBefore(gate);
      for (const id of gate.tension) {
        expect(obtainable.has(id), `${gate.id} が突きつける ${id} を、扉の前で拾えない`).toBe(true);
      }
    }
  });

  it('開始地点が存在する', () => {
    expect(findPlace(world, world.start)).toBeDefined();
  });

  it('すべての場所へ、扉を開けば辿り着ける', () => {
    const seen = new Set<PlaceId>([world.start]);
    const queue: PlaceId[] = [world.start];
    while (queue.length > 0) {
      for (const to of findPlace(world, queue.shift()!)!.links) {
        if (seen.has(to)) continue;
        seen.add(to);
        queue.push(to);
      }
    }
    const stranded = world.places.filter((p) => !seen.has(p.id)).map((p) => p.id);
    expect(stranded, `どこからも歩いて行けない場所がある: ${stranded.join(', ')}`).toEqual([]);
  });

  it('場所・断片・対話の id に重複が無い', () => {
    const ids = [
      ...world.places.map((p) => p.id),
      ...world.fragments.map((f) => f.id),
      ...world.places.flatMap((p) => p.talks.map((t) => t.id)),
    ];
    expect(new Set(ids).size, `重複した id がある: ${ids.join(', ')}`).toBe(ids.length);
  });

  it('対話が与える断片は、すべて定義済みである', () => {
    const known = new Set(world.fragments.map((f) => f.id));
    for (const place of world.places) {
      for (const talk of place.talks) {
        for (const id of talk.grants) {
          expect(known.has(id), `${talk.id} が未定義の断片 ${id} を与えている`).toBe(true);
        }
      }
    }
  });

  it('場所のつながりは双方向である', () => {
    for (const place of world.places) {
      for (const linked of place.links) {
        const other = world.places.find((p) => p.id === linked);
        expect(other, `${place.id} → ${linked} の行き先が無い`).toBeDefined();
        expect(other!.links, `${linked} から ${place.id} へ戻れない`).toContain(place.id);
      }
    }
  });
});

/**
 * その扉の前に立つ時点で、手にしていることがありうる断片。
 *
 * どの扉も一枚差し出せば開き、その一枚は開始地点で必ず手に入る（上のテストで縛ってある）。
 * だから他の扉はすべて通れるものとして数え、除くのは
 * この扉の向こうを通らなければ届かない断片だけになる。
 */
function fragmentsObtainableBefore(gate: Gate): Set<FragmentId> {
  const seen = new Set<PlaceId>([world.start]);
  const queue: PlaceId[] = [world.start];
  while (queue.length > 0) {
    const place = findPlace(world, queue.shift()!)!;
    for (const to of place.links) {
      if (seen.has(to) || to === gate.beyond) continue;
      seen.add(to);
      queue.push(to);
    }
  }
  return new Set([...seen].flatMap((id) => findPlace(world, id)!.talks.flatMap((t) => t.grants)));
}

/**
 * その扉の手前まで、実際に歩いて拾えるものを拾った状態を作る。
 * 机上の集合（fragmentsObtainableBefore）ではなく engine を通すので、
 * 「そう歩ける道が本当にあるか」までここで確かめられる。
 * 目当ての扉だけは開けずに残し、途中の扉は手持ちの一枚で開けて通り抜ける。
 */
function walkTo(gate: Gate): GameState {
  let state = createInitialState(world);
  const visited = new Set<PlaceId>([world.start]);

  // 行って戻る形で町を辿る。MOVE は隣へしか動けないので、来た道を必ず引き返す
  function explore(from: PlaceId) {
    for (const talk of findPlace(world, from)!.talks) {
      state = reduce(state, { type: 'FINISH_TALK', talkId: talk.id }, world);
    }
    for (const to of findPlace(world, from)!.links) {
      if (visited.has(to) || to === gate.beyond) continue;
      visited.add(to);
      const guard = gateGuarding(world, to);
      if (guard) {
        // 途中の扉は、そのとき手にしている一枚で開ける（どの一枚でも開く）
        state = reduce(
          state,
          { type: 'OPEN_GATE', gateId: guard.id, fragmentId: state.fragmentIds[0] },
          world,
        );
      }
      state = reduce(state, { type: 'MOVE', to }, world);
      explore(to);
      state = reduce(state, { type: 'MOVE', to: from }, world);
    }
  }

  explore(world.start);

  // 最後に、扉の手前の場所まで歩いて立つ
  const front = world.places.find((p) => p.links.includes(gate.beyond))!;
  for (const step of pathTo(front.id, state, gate.beyond)) {
    state = reduce(state, { type: 'MOVE', to: step }, world);
  }
  return state;
}

/** 開始地点から目的地までの道順。閉じたままの扉と、避けたい場所は通らない */
function pathTo(goal: PlaceId, state: GameState, avoid: PlaceId): PlaceId[] {
  const cameFrom = new Map<PlaceId, PlaceId>();
  const queue: PlaceId[] = [world.start];
  const seen = new Set<PlaceId>([world.start]);
  while (queue.length > 0) {
    const here = queue.shift()!;
    if (here === goal) break;
    for (const to of findPlace(world, here)!.links) {
      const guard = gateGuarding(world, to);
      if (seen.has(to) || to === avoid) continue;
      if (guard && !state.openedGateIds.includes(guard.id)) continue;
      seen.add(to);
      cameFrom.set(to, here);
      queue.push(to);
    }
  }
  const path: PlaceId[] = [];
  for (let at = goal; at !== world.start; at = cameFrom.get(at)!) path.unshift(at);
  return path;
}
