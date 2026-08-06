import type { FragmentId, GateId, World } from '../scenario/types';
import type { GameState, GateChoice } from './state';
import { findPlace, isSealed } from './state';

/**
 * 保存されたものを GameState に読み戻す層。
 * localStorage には触れない（触るのは store/）。ここは素の値を受けて形を検める純粋関数だけを置く。
 *
 * なぜ検めるのか。保存の中身は信用できない。手で書き換えられるし、
 * 世界データ（scenario/）を書き足した／削ったあとに古い保存が残る。
 * 検めずに GameState として流すと「世界に無い場所に立っている」「消えた断片を持っている」
 * 状態が engine を素通りし、ルールは engine に一本化するという約束が破れる。
 *
 * 方針は「捨てるより落とす」。読めなかった一件を落として歩みは残す。
 * ただし立っている場所だけは落としようがないので、そのときは保存ごと捨てる。
 */
export function restoreState(world: World, raw: unknown): GameState | null {
  const saved = asRecord(raw);
  if (!saved) return null;

  const standing = asString(saved.currentPlaceId);
  // 立っている場所が世界から消えていたら、どこへ戻せばよいか決められない。保存ごと捨てる
  if (standing === null || !findPlace(world, standing)) return null;

  const placeIds = idsOf(world.places);
  const fragmentIds = idsOf(world.fragments);
  const gateIds = idsOf(world.gates);
  const talkIds = idsOf(world.places.flatMap((p) => p.talks));

  const visited = knownIds(saved.visitedPlaceIds, placeIds);
  const fragments = knownIds(saved.fragmentIds, fragmentIds);
  const openedGates = knownIds(saved.openedGateIds, gateIds);
  const gateChoices = restoreChoices(saved.gateChoices, openedGates, fragments);
  // 開いた扉と置いた記録は対で残す。片側だけ残すと、扉は開いているのに軌跡に出ない一枚が生まれ、
  // 「三つの戸すべてで片方を置いた」を数える隠しの終幕が、二つしか置いていない歩みでも成り立つ
  const placed = new Set(gateChoices.map((choice) => choice.gateId));

  // 封じの判定にしか使わない一時の姿。立っている場所はこのあと決め直す
  const restored: GameState = {
    currentPlaceId: standing,
    visitedPlaceIds: visited,
    fragmentIds: fragments,
    finishedTalkIds: knownIds(saved.finishedTalkIds, talkIds),
    openedGateIds: openedGates.filter((id) => placed.has(id)),
    gateChoices,
  };

  /*
   * まだ入れない場所に立った保存は通さない。
   * 扉を開いた記録だけを消せば、閉じた戸の向こう側や、条件の満たない終幕の場所に
   * 立った状態を書ける。そこから終幕を引けてしまうと、
   * 「そこへ来られる条件は engine が守っている」が保存経由で破れる。
   *
   * 歩みごと捨てずに始まりの場所へ戻すのは、扉を足すなど世界を書き足したときに、
   * それまで正しく歩いてきた人の断片まで流さないため。
   */
  const here = isSealed(world, restored, standing) ? world.start : standing;
  // 始まりの場所すら封じられている世界では、戻す先が無い
  if (isSealed(world, restored, here)) return null;
  return {
    ...restored,
    currentPlaceId: here,
    // 立っている場所は必ず訪れたことになる。保存側が欠けていても矛盾を残さない
    visitedPlaceIds: visited.includes(here) ? visited : [...visited, here],
  };
}

/**
 * 戸に置いてきた記録。
 * reduce は「開いた扉」と「置いた一枚」を必ず対で積むので、読み戻すときも対で揃うものだけ残す。
 * 扉ごとに高々一件という不変条件もここで守る（axes と trace がそれを前提にしている）。
 */
function restoreChoices(
  raw: unknown,
  openedGateIds: GateId[],
  fragmentIds: FragmentId[],
): GateChoice[] {
  if (!Array.isArray(raw)) return [];
  const placed = new Set<GateId>();
  const result: GateChoice[] = [];
  for (const item of raw) {
    const record = asRecord(item);
    if (!record) continue;
    const gateId = asString(record.gateId);
    const fragmentId = asString(record.fragmentId);
    if (gateId === null || fragmentId === null) continue;
    if (!openedGateIds.includes(gateId)) continue;
    // 持っていない断片を置いたことにはできない
    if (!fragmentIds.includes(fragmentId)) continue;
    if (placed.has(gateId)) continue;
    placed.add(gateId);
    result.push({ gateId, fragmentId });
  }
  return result;
}

function idsOf(items: { id: string }[]): Set<string> {
  return new Set(items.map((item) => item.id));
}

/** 配列らしきものから、世界にある id だけを保存された順・重複なしで取り出す */
function knownIds(raw: unknown, known: Set<string>): string[] {
  if (!Array.isArray(raw)) return [];
  const result: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    if (!known.has(item)) continue;
    if (result.includes(item)) continue;
    result.push(item);
  }
  return result;
}

/** 配列は除く。JSON の配列を「キーを持つもの」として読み違えないようにするため */
function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}
