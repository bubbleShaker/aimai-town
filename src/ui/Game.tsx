import { useState } from 'react';
import { world } from '../scenario';
import type { FragmentId, GateId, PlaceId, TalkId } from '../scenario/types';
import {
  collectedFragments,
  createInitialState,
  findFragment,
  findGate,
  findPlace,
  findTalk,
  gateResponse,
  gatesAhead,
  offerableFragments,
  pendingGrants,
  reduce,
} from '../engine/state';
import type { GameState } from '../engine/state';
import { GateView } from './GateView';
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
  | { kind: 'reading'; lines: ShownLine[]; shown: number; then: AfterReading }
  | { kind: 'choosing'; gateId: GateId }
  | { kind: 'note' };

/**
 * 読み終えたときに何が起きるか。
 * 手続きではなくデータとして持たせておくと、扉やエンディングが増えても
 * 「読む」処理そのものは変えずに済む。
 */
type AfterReading =
  | { kind: 'idle' }
  | { kind: 'finishTalk'; talkId: TalkId }
  | { kind: 'choosing'; gateId: GateId }
  | { kind: 'openGate'; gateId: GateId; fragmentId: FragmentId };

export function Game() {
  const [state, setState] = useState<GameState>(() => createInitialState(world));
  const [scene, setScene] = useState<Scene>(() => ({
    kind: 'reading',
    lines: findPlace(world, world.start)!.arrival,
    shown: 1,
    then: { kind: 'idle' },
  }));

  const place = findPlace(world, state.currentPlaceId)!;
  const pendingGates = gatesAhead(world, state);

  function read(lines: ShownLine[], then: AfterReading = { kind: 'idle' }) {
    setScene({ kind: 'reading', lines, shown: 1, then });
  }

  function move(to: PlaceId) {
    // 先に engine へ問い合わせ、実際に動けたときだけ画面を切り替える
    const moved = reduce(state, { type: 'MOVE', to }, world);
    if (moved === state) return;
    setState(moved);
    const firstVisit = !state.visitedPlaceIds.includes(to);
    // 初めての場所だけ、到着の描写を読ませる
    if (firstVisit) read(findPlace(world, to)!.arrival);
    else setScene({ kind: 'idle' });
  }

  function startTalk(talkId: TalkId) {
    const talk = findTalk(world, state, talkId);
    if (!talk) return;
    // 対話の末尾に、これから得る断片を一行ずつ足して見せる
    const gained: ShownLine[] = pendingGrants(world, state, talkId).map((f) => ({
      text: f.text,
      fragment: true,
    }));
    read([...talk.lines, ...gained], { kind: 'finishTalk', talkId });
  }

  function approachGate(gateId: GateId) {
    const gate = findGate(world, gateId);
    if (!gate) return;
    read(gate.prologue, { kind: 'choosing', gateId });
  }

  function offer(gateId: GateId, fragmentId: FragmentId) {
    const gate = findGate(world, gateId);
    if (!gate) return;
    read(gateResponse(gate, fragmentId).lines, { kind: 'openGate', gateId, fragmentId });
  }

  function advance() {
    if (scene.kind !== 'reading') return;
    if (scene.shown < scene.lines.length) {
      setScene({ ...scene, shown: scene.shown + 1 });
      return;
    }
    // 読み終えた時点ではじめて、断片が身につき、扉が開く
    const then = scene.then;
    switch (then.kind) {
      case 'finishTalk':
        setState((s) => reduce(s, { type: 'FINISH_TALK', talkId: then.talkId }, world));
        setScene({ kind: 'idle' });
        break;
      case 'openGate':
        setState((s) =>
          reduce(s, { type: 'OPEN_GATE', gateId: then.gateId, fragmentId: then.fragmentId }, world),
        );
        setScene({ kind: 'idle' });
        break;
      case 'choosing':
        setScene({ kind: 'choosing', gateId: then.gateId });
        break;
      default:
        setScene({ kind: 'idle' });
    }
  }

  const choosingGate = scene.kind === 'choosing' ? findGate(world, scene.gateId) : undefined;

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
            {pendingGates.map((gate) => (
              <button
                key={gate.id}
                className="button is-gate"
                onClick={() => approachGate(gate.id)}
              >
                {gate.name}の前に立つ
              </button>
            ))}
            <button className="button is-quiet" onClick={() => setScene({ kind: 'note' })}>
              思索のノート（{state.fragmentIds.length}）
            </button>
            <p className="actions-hint">霧の中の灯をえらぶと、そこへ歩く</p>
          </div>
        )}

        {choosingGate && (
          <GateView
            gate={choosingGate}
            tension={choosingGate.tension
              .map((id) => findFragment(world, id))
              .filter((f) => f !== undefined)}
            hand={offerableFragments(world, state)}
            onOffer={(fragmentId) => offer(choosingGate.id, fragmentId)}
            onLeave={() => setScene({ kind: 'idle' })}
          />
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
