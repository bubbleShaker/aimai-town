import { useState } from 'react';
import { world } from '../scenario';
import type { PlaceId, TalkId } from '../scenario/types';
import {
  collectedFragments,
  createInitialState,
  findPlace,
  findTalk,
  pendingGrants,
  reduce,
} from '../engine/state';
import type { GameState } from '../engine/state';
import { MapView } from './MapView';
import { NoteView } from './NoteView';
import { StoryView } from './StoryView';
import type { ShownLine } from './StoryView';

/**
 * 画面の状態。ゲームの進行そのもの（GameState）とは分けて持つ。
 * 「対話の何行目を読んでいるか」はセーブしても意味がない情報なので、engine には置かない。
 */
type Scene =
  | { kind: 'idle' }
  | { kind: 'reading'; lines: ShownLine[]; shown: number; talkId?: TalkId }
  | { kind: 'note' };

export function Game() {
  const [state, setState] = useState<GameState>(() => createInitialState(world));
  const [scene, setScene] = useState<Scene>(() => ({
    kind: 'reading',
    lines: findPlace(world, world.start)!.arrival,
    shown: 1,
  }));

  const place = findPlace(world, state.currentPlaceId)!;

  function move(to: PlaceId) {
    // 先に engine へ問い合わせ、実際に動けたときだけ画面を切り替える
    const moved = reduce(state, { type: 'MOVE', to }, world);
    if (moved === state) return;
    setState(moved);
    const next = findPlace(world, moved.currentPlaceId)!;
    // 初めての場所だけ、到着の描写を読ませる
    const firstVisit = !state.visitedPlaceIds.includes(to);
    setScene(firstVisit ? { kind: 'reading', lines: next.arrival, shown: 1 } : { kind: 'idle' });
  }

  function startTalk(talkId: TalkId) {
    const talk = findTalk(world, state, talkId);
    if (!talk) return;
    // 対話の末尾に、これから得る断片を一行ずつ足して見せる
    const gained: ShownLine[] = pendingGrants(world, state, talkId).map((f) => ({
      text: f.text,
      fragment: true,
    }));
    setScene({ kind: 'reading', lines: [...talk.lines, ...gained], shown: 1, talkId });
  }

  function advance() {
    if (scene.kind !== 'reading') return;
    if (scene.shown < scene.lines.length) {
      setScene({ ...scene, shown: scene.shown + 1 });
      return;
    }
    // 読み終えた時点で、はじめて断片が身につく
    if (scene.talkId) {
      const talkId = scene.talkId;
      setState((s) => reduce(s, { type: 'FINISH_TALK', talkId }, world));
    }
    setScene({ kind: 'idle' });
  }

  return (
    <div className="game">
      <MapView world={world} state={state} onMove={scene.kind === 'idle' ? move : null} />

      <div className="panel">
        {scene.kind === 'reading' && (
          <StoryView lines={scene.lines} shown={scene.shown} onAdvance={advance} />
        )}

        {scene.kind === 'idle' && (
          <div className="actions">
            <p className="actions-here">{place.name}にいる</p>
            {place.talks.map((talk) => (
              <button key={talk.id} className="button" onClick={() => startTalk(talk.id)}>
                {talk.label}
                {state.finishedTalkIds.includes(talk.id) && <span className="button-note">（再）</span>}
              </button>
            ))}
            <button className="button is-quiet" onClick={() => setScene({ kind: 'note' })}>
              思索のノート（{state.fragmentIds.length}）
            </button>
            <p className="actions-hint">霧の中の灯をえらぶと、そこへ歩く</p>
          </div>
        )}

        {scene.kind === 'note' && (
          <NoteView
            fragments={collectedFragments(world, state)}
            onClose={() => setScene({ kind: 'idle' })}
          />
        )}
      </div>
    </div>
  );
}
