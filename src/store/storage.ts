/**
 * localStorage との、いちばん低いところでのやりとり。
 *
 * 「保存が効かないことより、遊べなくなることのほうが悪い」という構えを一箇所に置く。
 * 歩みの保存（save）と、読んだ言葉の記録（lore）が同じ構えを別々に書くと、
 * 片方だけが例外で落ちる作りに育つ。
 *
 * 何をどんな形で書くかは、この層では決めない（版番号も中身の検めも呼ぶ側）。
 */

/**
 * localStorage は「あるのに使えない」ことがある。
 * プライベートモードや設定で参照そのものが投げるので、触る前に包んで確かめる。
 */
function available(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** 書けなくても黙って諦める。保存量の上限などで失敗するが、歩みは続けられる */
export function writeJson(key: string, value: unknown): void {
  const storage = available();
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // 書けなかった
  }
}

/** 読めない・無い・JSON として壊れているときは null。中身の検めは呼ぶ側 */
export function readJson(key: string): unknown {
  const storage = available();
  if (!storage) return null;
  try {
    const text = storage.getItem(key);
    return text === null ? null : JSON.parse(text);
  } catch {
    return null;
  }
}

export function remove(key: string): void {
  const storage = available();
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    // 消せなくても遊びは止めない
  }
}
