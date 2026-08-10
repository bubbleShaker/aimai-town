import { useEffect, useState } from 'react';
import { world } from '../scenario';
import type { PlaceId, TalkId } from '../scenario/types';
import {
  collectedFragments,
  createInitialState,
  findPlace,
  findTalk,
  gateResponse,
  gateTension,
  gatesAhead,
  isUntouched,
  offerableFragments,
  pendingGrants,
  reduce,
  resolveEnding,
  trace,
} from '../engine/state';
import type { GameState } from '../engine/state';
import type { Lore, Reading } from '../engine/lore';
import { markRead } from '../engine/lore';
import { loadLore, saveLore } from '../store/lore';
import { clearSave, loadState, saveState } from '../store/save';
import { EndingView } from './EndingView';
import { GateView } from './GateView';
import { MapView } from './MapView';
import { NoteView } from './NoteView';
import { StoryView } from './StoryView';
import type { AfterReading, Scene, ShownLine } from './scene';
import { beginReading, isFacing } from './scene';
import { TraceView } from './TraceView';

/** 町へ降りたところ。始めるときと、始め直すときの両方から使う */
function opening(lore: Lore): Scene {
  return beginReading(
    lore,
    { kind: 'arrival', placeId: world.start },
    findPlace(world, world.start)!.arrival,
  );
}

/**
 * 始めかたを一度だけ決める。前に歩いた記録があればそこから、無ければ町へ降りるところから。
 * 進行と場面をまとめて決めているのは、保存の読み込みを二度走らせないため。
 * 読んだ言葉の記録もここで読む（場面を組むのに要る）。
 *
 * 続きから始めるときは到着の描写を読み直さない。もうその場所に立っているため。
 */
function beginning(): { state: GameState; scene: Scene; lore: Lore } {
  const lore = loadLore();
  const saved = loadState(world);
  return saved
    ? { state: saved, scene: { kind: 'idle' }, lore }
    : { state: createInitialState(world), scene: opening(lore), lore };
}

export function Game() {
  const [begun] = useState(beginning);
  const [state, setState] = useState<GameState>(begun.state);
  const [scene, setScene] = useState<Scene>(begun.scene);
  const [lore, setLore] = useState<Lore>(begun.lore);

  /*
   * 進行が変わるたび書き戻す。書けない環境でも遊びは止まらない（store が飲み込む）。
   * 保存するのは GameState だけで、場面（Scene）は保存しない。
   * 「対話の何行目か」を復元しても意味が無く、GameState をそのまま載せる形も崩れるため。
   *
   * まだ何もしていない状態は書かない。町へ降りる場面を読んでいる途中でタブを閉じた人に、
   * 次に開いたときその文を飛ばさせないため。始め直した直後も、同じ理由で書かない。
   */
  useEffect(() => {
    if (isUntouched(world, state)) return;
    saveState(state);
  }, [state]);

  /*
   * 読んだ言葉の記録は、歩みとは別に書き戻す。始め直しでも消えず周回を越える。
   * まだ何も読み切っていないうちは書かない（記録が無いのと同じなので）。
   * markRead は覚えているものを覚え直すと同じ参照を返すので、無駄な書き戻しも起きない。
   */
  useEffect(() => {
    if (lore.readIds.length === 0) return;
    saveLore(lore);
  }, [lore]);

  const place = findPlace(world, state.currentPlaceId)!;
  const pendingGates = gatesAhead(world, state);

  function read(reading: Reading, lines: ShownLine[], then: AfterReading = { kind: 'idle' }) {
    setScene(beginReading(lore, reading, lines, then));
  }

  /**
   * はじめから歩き直す。集めた断片も、戸に置いた選択もすべて流す。
   * 持ち越すのは「一度読んだか」の記録だけで、それは lore に残る（消さない）。
   */
  function restart() {
    // 置いてきたものは保存からも消す。書き戻しは何もしていない状態を書かないので、
    // このあと消したものが上書きで戻ってくることはない
    clearSave();
    setState(createInitialState(world));
    setScene(opening(lore));
  }

  function move(to: PlaceId) {
    // 先に engine へ問い合わせ、実際に動けたときだけ画面を切り替える
    const moved = reduce(state, { type: 'MOVE', to }, world);
    if (moved === state) return;
    setState(moved);
    const firstVisit = !state.visitedPlaceIds.includes(to);
    // 初めての場所だけ、到着の描写を読ませる
    if (firstVisit) read({ kind: 'arrival', placeId: to }, findPlace(world, to)!.arrival);
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
    read({ kind: 'talk', talkId }, [...talk.lines, ...gained], { kind: 'finishTalk', talkId });
  }

  function advance() {
    if (scene.kind !== 'reading') return;
    if (scene.shown < scene.lines.length) {
      setScene({ ...scene, shown: scene.shown + 1 });
      return;
    }
    // ここまで来た人は最後の一行まで読み切っている。次からは待たせない。
    // 途中で閉じた人を覚えてしまうと、次に開いたとき一行も目にしないまま通過できる
    setLore(markRead(lore, scene.reading));

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
    <div className={isFacing(scene) ? 'game is-facing' : 'game'}>
      <MapView world={world} state={state} onMove={scene.kind === 'idle' ? move : null} />

      <div className="panel">
        {scene.kind === 'reading' && (
          <StoryView
            lines={scene.lines}
            shown={scene.shown}
            onAdvance={advance}
            doneLabel={scene.then.kind === 'ending' ? '▼ 灯を見る' : undefined}
            /* 一度読み切った言葉は、送らずそのまま出す。どこまで開くかと同じ拍で決めてある */
            instant={scene.instant}
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
                  read({ kind: 'ending', endingId: ending.id }, ending.lines, {
                    kind: 'ending',
                    ending,
                  });
                }}
              >
                水に映る灯を見る
              </button>
            )}
            {pendingGates.map((gate) => (
              <button
                key={gate.id}
                className="button is-gate"
                onClick={() =>
                  read({ kind: 'gate', gateId: gate.id }, gate.prologue, {
                    kind: 'choosing',
                    gate,
                  })
                }
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
              read(
                { kind: 'reply', gateId: scene.gate.id, fragmentId },
                gateResponse(scene.gate, fragmentId).lines,
                { kind: 'openGate', gate: scene.gate, fragmentId },
              )
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
          <TraceView traces={trace(world, state)} closing={world.closing} onRestart={restart} />
        )}
      </div>
    </div>
  );
}
