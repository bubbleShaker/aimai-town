import { useState } from 'react';
import { world } from '../scenario';
import type { Ending, FragmentId, Gate, PlaceId, TalkId } from '../scenario/types';
import {
  collectedFragments,
  createInitialState,
  findPlace,
  findTalk,
  gateResponse,
  gateTension,
  gatesAhead,
  offerableFragments,
  pendingGrants,
  reduce,
  resolveEnding,
  trace,
} from '../engine/state';
import type { GameState } from '../engine/state';
import { EndingView } from './EndingView';
import { GateView } from './GateView';
import { MapView } from './MapView';
import { NoteView } from './NoteView';
import { StoryView } from './StoryView';
import type { ShownLine } from './StoryView';
import { TraceView } from './TraceView';

/**
 * 画面の状態。ゲームの進行そのもの（GameState）とは分けて持つ。
 * 「対話の何行目を読んでいるか」はセーブしても意味がない情報なので、engine には置かない。
 * 扉は id ではなく実体で持つ。引き直しに失敗して画面が空になる経路を型で消すため。
 */
type Scene =
  | { kind: 'idle' }
  | { kind: 'reading'; lines: ShownLine[]; shown: number; then: AfterReading }
  | { kind: 'choosing'; gate: Gate }
  | { kind: 'note' }
  | { kind: 'ending'; ending: Ending }
  | { kind: 'trace' };

/**
 * 読み終えたときに何が起きるか。
 * 手続きではなくデータとして持たせておくと、扉やエンディングが増えても
 * 「読む」処理そのものは変えずに済む。
 */
type AfterReading =
  | { kind: 'idle' }
  | { kind: 'finishTalk'; talkId: TalkId }
  | { kind: 'choosing'; gate: Gate }
  | { kind: 'openGate'; gate: Gate; fragmentId: FragmentId }
  | { kind: 'ending'; ending: Ending };

/** 町を畳んで手もとだけを見せる場面。戸の前と、終わったあと */
const FACING: Scene['kind'][] = ['choosing', 'ending', 'trace'];

/** 町へ降りたところ。始めるときと、始め直すときの両方から使う */
function opening(): Scene {
  return {
    kind: 'reading',
    lines: findPlace(world, world.start)!.arrival,
    shown: 1,
    then: { kind: 'idle' },
  };
}

export function Game() {
  const [state, setState] = useState<GameState>(() => createInitialState(world));
  const [scene, setScene] = useState<Scene>(opening);

  const place = findPlace(world, state.currentPlaceId)!;
  const pendingGates = gatesAhead(world, state);

  function read(lines: ShownLine[], then: AfterReading = { kind: 'idle' }) {
    setScene({ kind: 'reading', lines, shown: 1, then });
  }

  /**
   * はじめから歩き直す。集めた断片も、戸に置いた選択もすべて流す。
   * 周回に何かを持ち越すのは M5 の話なので、ここでは何も引き継がない。
   */
  function restart() {
    setState(createInitialState(world));
    setScene(opening());
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

  function advance() {
    if (scene.kind !== 'reading') return;
    if (scene.shown < scene.lines.length) {
      setScene({ ...scene, shown: scene.shown + 1 });
      return;
    }
    // 読み終えた時点ではじめて、断片が身につき、扉が開く。
    // 変化を起こす行動は engine に投げ、その結果を見てから画面を決める
    const then = scene.then;
    switch (then.kind) {
      case 'finishTalk':
        setState(reduce(state, { type: 'FINISH_TALK', talkId: then.talkId }, world));
        setScene({ kind: 'idle' });
        break;
      case 'openGate': {
        const opened = reduce(
          state,
          { type: 'OPEN_GATE', gateId: then.gate.id, fragmentId: then.fragmentId },
          world,
        );
        setState(opened);
        // engine が受け付けなかったら扉は閉じたまま。戸の前へ戻す
        setScene(opened === state ? { kind: 'choosing', gate: then.gate } : { kind: 'idle' });
        break;
      }
      case 'choosing':
        setScene({ kind: 'choosing', gate: then.gate });
        break;
      case 'ending':
        setScene({ kind: 'ending', ending: then.ending });
        break;
      case 'idle':
        setScene({ kind: 'idle' });
        break;
      default: {
        // AfterReading に枝を足したとき、ここで型エラーになって気づける
        const exhaustive: never = then;
        throw new Error(`未処理の遷移: ${JSON.stringify(exhaustive)}`);
      }
    }
  }

  return (
    /* 戸に向き合っているあいだと終幕は、町を畳んで手もとだけを見せる */
    <div className={FACING.includes(scene.kind) ? 'game is-facing' : 'game'}>
      <MapView world={world} state={state} onMove={scene.kind === 'idle' ? move : null} />

      <div className="panel">
        {scene.kind === 'reading' && (
          <StoryView
            lines={scene.lines}
            shown={scene.shown}
            onAdvance={advance}
            doneLabel={scene.then.kind === 'ending' ? '▼ 灯を見る' : undefined}
          />
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
            {/* 終幕の場所でだけ現れる、最後の行動。ここへ来られる条件は engine が守っている */}
            {place.id === world.finale && (
              <button
                className="button is-lit"
                onClick={() => {
                  const ending = resolveEnding(world, state);
                  read(ending.lines, { kind: 'ending', ending });
                }}
              >
                水に映る灯を見る
              </button>
            )}
            {pendingGates.map((gate) => (
              <button
                key={gate.id}
                className="button is-gate"
                onClick={() => read(gate.prologue, { kind: 'choosing', gate })}
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

        {scene.kind === 'choosing' && (
          <GateView
            title={scene.gate.name}
            tension={gateTension(world, scene.gate)}
            hand={offerableFragments(world, state, scene.gate)}
            onOffer={(fragmentId) =>
              read(gateResponse(scene.gate, fragmentId).lines, {
                kind: 'openGate',
                gate: scene.gate,
                fragmentId,
              })
            }
            onLeave={() => setScene({ kind: 'idle' })}
          />
        )}

        {scene.kind === 'note' && (
          <NoteView
            fragments={collectedFragments(world, state)}
            onClose={() => setScene({ kind: 'idle' })}
          />
        )}

        {scene.kind === 'ending' && (
          <EndingView ending={scene.ending} onLookBack={() => setScene({ kind: 'trace' })} />
        )}

        {scene.kind === 'trace' && (
          <TraceView traces={trace(world, state)} onRestart={restart} />
        )}
      </div>
    </div>
  );
}
