import type { PlaceId, World } from '../scenario/types';
import type { GameState } from '../engine/state';
import { canMove, findPlace, isSealed, roads } from '../engine/state';

interface Props {
  world: World;
  state: GameState;
  /** 移動できないときは null を渡して、マップ全体を触れなくする（対話中など） */
  onMove: ((to: PlaceId) => void) | null;
}

/**
 * ノード型のマップ。
 * 道（線）は SVG、場所（円）は通常の DOM で描き、同じ座標系の上に重ねている。
 * SVG 側は preserveAspectRatio="none" にすることで viewBox の 0〜100 が
 * そのまま「コンテナの何 %」を意味するようになり、DOM 側の left/top の % と一致する。
 */
export function MapView({ world, state, onMove }: Props) {
  return (
    <div className="map">
      <svg className="map-roads" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {roads(world).map(([a, b]) => {
          const from = findPlace(world, a);
          const to = findPlace(world, b);
          if (!from || !to) return null;
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
        const reachable = onMove !== null && canMove(world, state, place.id);
        const visited = state.visitedPlaceIds.includes(place.id);
        // まだ入れない場所は、閉ざされていることが分かるように描く。
        // 何が閉ざしているか（扉か、終幕の条件か）は engine の判断に任せる
        const locked = isSealed(world, state, place.id);
        /*
         * まだ知らない場所。名前を伏せることと、霧に沈めることを同じ一つの判定から出す。
         * 二箇所に書くと、片方だけ書き換えたときに「名は出ているのに沈んでいる」場所ができる。
         */
        const unknown = !visited && !here;
        return (
          <button
            key={place.id}
            /* 名前は訪れるまで伏せてあるので、通しプレイの撮影はこの id で灯を掴む */
            data-place={place.id}
            className={[
              'place',
              here && 'is-here',
              reachable && 'is-reachable',
              locked && 'is-locked',
              // 知らない場所は霧の向こうに置く。名前を伏せているのと同じ遠さを、光でも出す
              unknown && 'is-far',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{ left: `${place.x}%`, top: `${place.y}%` }}
            disabled={!reachable}
            onClick={() => onMove?.(place.id)}
            aria-current={here ? 'location' : undefined}
          >
            <span className="place-dot" />
            <span className="place-name">{unknown ? '？' : place.name}</span>
          </button>
        );
      })}
    </div>
  );
}
