import { describe, expect, it } from 'vitest';
import { world } from '../scenario';
import type {
  AxisShift,
  EndingId,
  FragmentId,
  Gate,
  GateId,
  PlaceId,
  TalkId,
} from '../scenario/types';
import type { GameState } from './state';
import {
  allGatesOpened,
  axes,
  canMove,
  endingOfAxes,
  collectedFragments,
  createInitialState,
  findFragment,
  findGate,
  findPlace,
  gateGuarding,
  gateResponse,
  gatesAhead,
  isSealed,
  isUntouched,
  pendingGrants,
  reduce,
  resolveEnding,
  resolveEndingId,
  roads,
  trace,
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

describe('軸', () => {
  it('扉をひとつも開いていないうちは、どちらへも振れていない', () => {
    expect(axes(world, createInitialState(world))).toEqual({ distance: 0, certainty: 0 });
  });

  it('扉に置いた一枚の分だけ振れる', () => {
    let s = reduce(createInitialState(world), { type: 'MOVE', to: 'loom' }, world);
    s = reduce(s, { type: 'FINISH_TALK', talkId: 't-master' }, world);
    s = reduce(s, { type: 'OPEN_GATE', gateId: 'g-work', fragmentId: 'f-autonomy' }, world);
    const gate = findGate(world, 'g-work')!;
    expect(axes(world, s)).toEqual(gate.responses['f-autonomy'].shift);
  });

  it('置いた分が積み重なる', () => {
    const s = playThrough({ 'g-work': 'f-autonomy', 'g-chat': 'f-bonding' });
    const work = findGate(world, 'g-work')!.responses['f-autonomy'].shift;
    const chat = findGate(world, 'g-chat')!.responses['f-bonding'].shift;
    const happiness = findGate(world, 'g-happiness')!;
    // 三つ目は playThrough の既定（そのとき手にしている先頭の一枚）で開いている
    const third = gateResponse(happiness, s.gateChoices[2].fragmentId).shift;
    expect(axes(world, s)).toEqual({
      distance: work.distance + chat.distance + third.distance,
      certainty: work.certainty + chat.certainty + third.certainty,
    });
  });
});

describe('終幕', () => {
  it('扉をすべて開くまで、霧の底へは歩けない', () => {
    let s = reduce(createInitialState(world), { type: 'MOVE', to: 'well' }, world);
    expect(allGatesOpened(world, s)).toBe(false);
    expect(isSealed(world, s, world.finale)).toBe(true);
    expect(canMove(world, s, world.finale)).toBe(false);
    s = reduce(s, { type: 'MOVE', to: world.finale }, world);
    expect(s.currentPlaceId).toBe('well');
  });

  it('三つの扉を開けば、霧の底まで歩ける', () => {
    const s = playThrough();
    expect(allGatesOpened(world, s)).toBe(true);
    expect(isSealed(world, s, world.finale)).toBe(false);
    expect(s.currentPlaceId).toBe(world.finale);
  });

  it('霧の底までの道のりで、町の言葉はすべて拾える', () => {
    const s = playThrough();
    expect([...s.fragmentIds].sort()).toEqual(world.fragments.map((f) => f.id).sort());
  });

  /**
   * 六つの終幕すべてに、そこへ至る遊び方が実在すること。
   * 扉に置く一枚の組み合わせを総当たりし、実際に engine を通して歩かせて確かめる。
   * 落ちたら「引けない終幕」＝書いたのに誰も読めない文があることになる。
   */
  it('六つの終幕すべてに、そこへ至る遊び方が実在する', () => {
    const reached = new Set<EndingId>();
    for (const state of everyPlaythrough()) reached.add(resolveEndingId(world, state));
    const missing = Object.keys(world.endings).filter((id) => !reached.has(id as EndingId));
    expect(missing, `どう遊んでも引けない終幕がある: ${missing.join(', ')}`).toEqual([]);
  });

  /**
   * 総当たりが痩せていないこと。
   * 扉の前で持っていない一枚を指定した組み合わせは数えないので、
   * 順路がずれて手札が減ると、六つ揃ったまま静かに検査が薄くなる。
   */
  it('総当たりが、扉の前の手札をすべて試している', () => {
    const tried = new Map<GateId, Set<FragmentId>>(world.gates.map((g) => [g.id, new Set()]));
    let count = 0;
    for (const state of everyPlaythrough()) {
      count++;
      for (const choice of state.gateChoices) tried.get(choice.gateId)!.add(choice.fragmentId);
    }
    const sizes = world.gates.map((g) => `${g.id}: ${tried.get(g.id)!.size}`);
    // playThrough の順路では、扉の前までに 機屋 6 枚・酒場 8 枚・灯台 11 枚 を拾っている。
    // 順路を継ぎ足したらこの数も変わる。変えずに減っていたら、道が痩せている
    expect(count, `扉ごとに置けた一枚 ${sizes.join(' / ')}`).toBe(6 * 8 * 11);
  });

  /**
   * 振れた向きと、そこで灯る名の対応。
   * id ではなく名で縛るので、判定の取り違えも、文の入れ違いも、ここで落ちる。
   * 優劣の話ではなく対応の話なので、「正解を用意しない」には触れない。
   */
  it('振れた向きと、そこで灯る名が対応している', () => {
    const table: [AxisShift, string][] = [
      [{ distance: -2, certainty: 2 }, '灯台の灯'], // 孤独 × 確信
      [{ distance: 2, certainty: 2 }, '織り手の手'], // 関わり × 確信
      [{ distance: 2, certainty: -2 }, '広場の灯'], // 関わり × 曖昧
      [{ distance: -2, certainty: -2 }, '霧のまま'], // 孤独 × 曖昧
      [{ distance: 0, certainty: 3 }, 'なかばの灯'], // 距離で止まった
      [{ distance: 3, certainty: 0 }, 'なかばの灯'], // 確信で止まった
      [{ distance: 0, certainty: 0 }, 'なかばの灯'], // どちらでも止まった
    ];
    for (const [shift, name] of table) {
      expect(world.endings[endingOfAxes(shift)].name, `${JSON.stringify(shift)} の灯`).toBe(name);
    }
  });

  it('どう遊んでも、必ずひとつの終幕に落ちる', () => {
    for (const state of everyPlaythrough()) {
      const ending = resolveEnding(world, state);
      expect(ending.id).toBe(resolveEndingId(world, state));
      expect(ending.lines.length).toBeGreaterThan(0);
    }
  });

  it('矛盾を矛盾のまま抱えると、名もなき灯になる', () => {
    // どの戸でも、突きつけられた二枚のうちの片方をそのまま置く
    const s = playThrough(
      Object.fromEntries(world.gates.map((g) => [g.id, g.tension[0]])) as Record<
        GateId,
        FragmentId
      >,
    );
    expect(s.currentPlaceId).toBe(world.finale);
    expect(resolveEndingId(world, s)).toBe('e-nameless');
  });

  it('間に第三の一枚を架ければ、名もなき灯にはならない', () => {
    const s = playThrough({ 'g-work': 'f-approval' });
    expect(s.currentPlaceId).toBe(world.finale);
    expect(resolveEndingId(world, s)).not.toBe('e-nameless');
  });
});

describe('軌跡', () => {
  it('扉をひとつも開いていないうちは、振り返るものが無い', () => {
    expect(trace(world, createInitialState(world))).toEqual([]);
  });

  it('開いた戸の数だけ、開いた順に並ぶ', () => {
    const s = playThrough();
    expect(trace(world, s).map((t) => t.gate.id)).toEqual(s.gateChoices.map((c) => c.gateId));
    expect(trace(world, s)).toHaveLength(world.gates.length);
  });

  it('戸ごとに、突きつけられた二枚と置いた一枚が実体で残る', () => {
    for (const t of trace(world, playThrough())) {
      expect(t.tension).toHaveLength(2);
      expect(t.tension.map((f) => f.id)).toEqual(findGate(world, t.gate.id)!.tension);
      expect(t.offered.text.length).toBeGreaterThan(0);
    }
  });

  it('軌跡は戸の名しか運ばない（軸の値を画面へ流さない）', () => {
    for (const t of trace(world, playThrough())) {
      expect(Object.keys(t.gate).sort()).toEqual(['id', 'name']);
    }
  });

  it('置いた一枚が、記録された選択と食い違わない', () => {
    const s = playThrough({ 'g-work': 'f-approval' });
    const work = trace(world, s).find((t) => t.gate.id === 'g-work');
    expect(work?.offered.id).toBe('f-approval');
  });

  it('突きつけられた片方をそのまま置いた戸は、架けたことにならない', () => {
    const gate = world.gates[0];
    const s = playThrough({ [gate.id]: gate.tension[0] });
    const walked = trace(world, s).find((t) => t.gate.id === gate.id);
    expect(walked?.bridged).toBe(false);
  });

  it('二枚のどちらでもない一枚を置いた戸は、架けたことになる', () => {
    const s = playThrough({ 'g-work': 'f-approval' });
    const work = trace(world, s).find((t) => t.gate.id === 'g-work');
    // f-approval は仕事の戸が突きつける二枚のどちらでもない
    expect(findGate(world, 'g-work')!.tension).not.toContain('f-approval');
    expect(work?.bridged).toBe(true);
  });

  /**
   * 軌跡の読みと終幕の判定が割れないこと。
   * 「架けなかった」を二か所で別々に判定すると、名もなき灯を引いたのに
   * エンドロールでは架けたことになっている、という食い違いが起きる。
   *
   * 逆向き（架けなければ必ず名もなき灯）は成り立たない。下のテストを見ること。
   */
  it('名もなき灯を引いた遊び方は、どの戸にも架けていない', () => {
    for (const s of everyPlaythrough()) {
      if (resolveEndingId(world, s) !== 'e-nameless') continue;
      expect(trace(world, s).every((t) => !t.bridged)).toBe(true);
    }
  });

  /**
   * 名もなき灯は「架けなかった」だけでは灯らない。町の言葉をすべて拾っていることも要る。
   * 灯台守に会わずに終幕まで行くと、どの戸にも架けていないのに別の灯になる。
   * これは不具合ではなく、隠しの一つを「拾い残しでも引ける」ものにしないための仕様。
   */
  it('架けなくても、町の言葉が欠けていれば名もなき灯にはならない', () => {
    const asIs = Object.fromEntries(world.gates.map((g) => [g.id, g.tension[0]])) as Record<
      GateId,
      FragmentId
    >;
    const s = playThrough(asIs, ['t-keeper']);
    expect(s.currentPlaceId).toBe(world.finale);
    expect(trace(world, s).every((t) => !t.bridged)).toBe(true);
    expect(s.fragmentIds.length).toBeLessThan(world.fragments.length);
    expect(resolveEndingId(world, s)).not.toBe('e-nameless');
  });

  /**
   * 数えるのは記録の件数ではなく町の戸の数、という担保。
   * 記録の側が欠けた状態（読み戻しで落ちることがある）を件数どうしで突き合わせると、
   * 欠けたぶんだけ「架けなかった」と見なして、二つしか置いていない歩みでも灯ってしまう。
   */
  it('置いた記録の欠けた戸があれば、名もなき灯にはならない', () => {
    const asIs = Object.fromEntries(world.gates.map((g) => [g.id, g.tension[0]])) as Record<
      GateId,
      FragmentId
    >;
    const s = playThrough(asIs);
    expect(resolveEndingId(world, s)).toBe('e-nameless');

    const missing = { ...s, gateChoices: s.gateChoices.slice(0, -1) };
    expect(trace(world, missing).every((t) => !t.bridged)).toBe(true);
    expect(resolveEndingId(world, missing)).not.toBe('e-nameless');
  });
});

describe('まだ何もしていない状態', () => {
  it('始めたばかりなら真', () => {
    expect(isUntouched(world, createInitialState(world))).toBe(true);
  });

  it('一歩でも歩けば、話せば、偽', () => {
    const moved = reduce(createInitialState(world), { type: 'MOVE', to: 'loom' }, world);
    expect(isUntouched(world, moved)).toBe(false);
    const talked = reduce(createInitialState(world), { type: 'FINISH_TALK', talkId: 't-child' }, world);
    expect(isUntouched(world, talked)).toBe(false);
  });
});

describe('世界の整合性', () => {
  it('終幕の場所は実在し、そこに住人はいない', () => {
    const finale = findPlace(world, world.finale);
    expect(finale, '終幕の場所が無い').toBeDefined();
    expect(finale!.talks, '終幕に住人を置かない（あるのは灯を見ることだけ）').toEqual([]);
  });

  it('終幕へ通じる道は一本だけである', () => {
    const neighbors = world.places.filter((p) => p.links.includes(world.finale));
    expect(neighbors.length, '終幕へ複数の入口がある').toBe(1);
  });

  /**
   * isSealed は場所ごとに「その場所を守る扉が開いているか」だけを見る。
   * 戸の向こうのさらに向こうに、扉の付いていない場所を足すと、
   * そこは「封じられていない」のに、戸を開かないと歩いては行けない場所になる。
   * 保存の読み戻しはこの一致を前提に、封じられた場所に立った記録を弾いている
   * （engine/restore を参照）。地形を足す人がコードを読まずに気づけるよう、ここで縛る。
   */
  it('封じられていない場所には、封じられた場所を通らずに歩いて行ける', () => {
    const initial = createInitialState(world);
    const reached = new Set<PlaceId>([world.start]);
    const queue: PlaceId[] = [world.start];
    while (queue.length > 0) {
      const from = findPlace(world, queue.shift()!)!;
      for (const to of from.links) {
        if (reached.has(to)) continue;
        if (isSealed(world, initial, to)) continue;
        reached.add(to);
        queue.push(to);
      }
    }
    const unsealed = world.places.filter((p) => !isSealed(world, initial, p.id)).map((p) => p.id);
    expect([...reached].sort(), '扉を開かずには歩いて行けないのに、封じられていない場所がある').toEqual(
      unsealed.sort(),
    );
  });

  it('終幕は、扉ではなく開いた扉の数で守られている', () => {
    // 扉で守ると「一枚差し出せば開く」ことになり、町を巡らずに終われてしまう
    expect(gateGuarding(world, world.finale)).toBeUndefined();
  });

  it('終幕の id と、書かれた文の見出しが一致する', () => {
    for (const [id, ending] of Object.entries(world.endings)) {
      expect(ending.id, `${id} の中身が別の終幕になっている`).toBe(id);
      expect(ending.name.length, `${id} に名が無い`).toBeGreaterThan(0);
    }
    const names = Object.values(world.endings).map((e) => e.name);
    expect(new Set(names).size, `終幕の名が重複している: ${names.join(', ')}`).toBe(names.length);
  });

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

  it('場所は、名前が折り返さない範囲に置かれている', () => {
    /*
     * 座標は表示のためのデータなので、置ける範囲がある。
     * 端に寄せすぎると絶対配置の幅が足りず、名前が折り返す。
     * 場所を書き足す人がコメントを読まなくて済むよう、ここで縛る。
     */
    for (const place of world.places) {
      expect(place.x, `${place.id} の x が端に寄りすぎている`).toBeGreaterThanOrEqual(11);
      expect(place.x, `${place.id} の x が端に寄りすぎている`).toBeLessThanOrEqual(86);
      expect(place.y, `${place.id} の y が端に寄りすぎている`).toBeGreaterThanOrEqual(10);
      expect(place.y, `${place.id} の y が端に寄りすぎている`).toBeLessThanOrEqual(90);
    }
  });

  it('右上の隅は空けてある（音を止める口が浮いている）', () => {
    /*
     * 隅には .sound が浮いていて、名札がそこへ届くと、
     * 灯を叩いたつもりで音が止まる。禁じるのは隅だけで足りる
     * （右下も左上も、口は無いので置いてよい）。
     */
    for (const place of world.places) {
      const inCorner = place.x > 80 && place.y < 20;
      expect(inCorner, `${place.id} が右上の隅にあり、音を止める口と重なる`).toBe(false);
    }
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
 * 町をひと巡りして三つの扉を開き、霧の底まで歩いた状態。
 *
 * `offers` で扉に置く一枚を指定できる。指定の無い扉は、そのとき手にしている先頭の一枚で開く。
 * `skipTalks` に挙げた相手とは話さない（言葉を拾い残したまま終幕へ着く道を作るため）。
 * 順路は決め打ちなので、町に場所や扉を足したらここも継ぎ足す
 * （継ぎ足し忘れは「町の言葉はすべて拾える」が落ちて分かる）。
 */
function playThrough(
  offers: Partial<Record<GateId, FragmentId>> = {},
  skipTalks: TalkId[] = [],
): GameState {
  let state = createInitialState(world);
  const go = (to: PlaceId) => {
    state = reduce(state, { type: 'MOVE', to }, world);
  };
  const talk = (talkId: TalkId) => {
    if (skipTalks.includes(talkId)) return;
    state = reduce(state, { type: 'FINISH_TALK', talkId }, world);
  };
  const open = (gateId: GateId) => {
    const fragmentId = offers[gateId] ?? state.fragmentIds[0];
    state = reduce(state, { type: 'OPEN_GATE', gateId, fragmentId }, world);
  };

  talk('t-child');
  talk('t-nameless');

  // 広場の隅の喫煙所。ここだけは二度話す（人にひとつ、火にひとつ）
  go('smoking');
  talk('t-smoker');
  talk('t-fire');
  go('square');

  go('loom');
  talk('t-master');
  open('g-work');
  go('loom-inner');
  talk('t-cloth');
  go('loom');
  go('square');

  go('tavern');
  talk('t-regular');
  open('g-chat');
  go('tavern-back');
  talk('t-wall');
  go('tavern');
  go('square');

  // 灯台の戸が突きつける一枚は井戸で拾うので、橋より先にここを通る
  go('well');
  talk('t-echo');
  go('square');

  go('bridge');
  talk('t-crosser');
  open('g-happiness');
  go('lighthouse');
  talk('t-keeper');
  go('bridge');
  go('square');

  go('well');
  go(world.finale);
  return state;
}

/**
 * 扉に置く一枚の組み合わせを総当たりした、遊び方のすべて。
 * その時点で持っていない一枚を指定した組み合わせは扉が開かず、
 * 霧の底まで届かないので数えない。
 */
function* everyPlaythrough(): Generator<GameState> {
  const ids = world.fragments.map((f) => f.id);
  for (const work of ids) {
    for (const chat of ids) {
      for (const happiness of ids) {
        const state = playThrough({
          'g-work': work,
          'g-chat': chat,
          'g-happiness': happiness,
        });
        if (state.currentPlaceId !== world.finale) continue;
        yield state;
      }
    }
  }
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
      // 終幕のように、扉を開くだけでは入れない場所は通らない
      if (!canMove(world, state, to)) continue;
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
