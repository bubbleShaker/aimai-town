import type { World } from '../scenario/types';
import type { GameState } from '../engine/state';
import { canMove } from '../engine/state';

interface Props {
  world: World;
  state: GameState;
  /** 移動できないときは null を渡して、マップ全体を触れなくする（対話中など） */
  onMove: ((to: string) => void) | null;
}

/**
 * ノード型のマップ。
 * 道（線）は SVG、場所（円）は通常の DOM で描き、同じ座標系の上に重ねている。
 * SVG 側は preserveAspectRatio="none" にすることで viewBox の 0〜100 が
 * そのまま「コンテナの何 %」を意味するようになり、DOM 側の left/top の % と一致する。
 */
export function MapView({ world, state, onMove }: Props) {
  const links = uniqueLinks(world);

  return (
    <div className="map">
      <svg className="map-roads" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {links.map(([a, b]) => {
          const from = world.places.find((p) => p.id === a)!;
          const to = world.places.find((p) => p.id === b)!;
          return (
            <line
              key={`${a}-${b}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              /* 座標を引き伸ばしても線の太さだけは保つ */
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>

      {world.places.map((place) => {
        const here = place.id === state.currentPlaceId;
        const reachable = onMove !== null && canMove(world, state.currentPlaceId, place.id);
        const visited = state.visitedPlaceIds.includes(place.id);
        return (
          <button
            key={place.id}
            className={['place', here && 'is-here', reachable && 'is-reachable'].filter(Boolean).join(' ')}
            style={{ left: `${place.x}%`, top: `${place.y}%` }}
            disabled={!reachable}
            onClick={() => onMove?.(place.id)}
            aria-current={here ? 'location' : undefined}
          >
            <span className="place-dot" />
            <span className="place-name">{visited || here ? place.name : '？'}</span>
          </button>
        );
      })}
    </div>
  );
}

/** 双方向の道を一本ずつに畳む */
function uniqueLinks(world: World): [string, string][] {
  const seen = new Set<string>();
  const result: [string, string][] = [];
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
