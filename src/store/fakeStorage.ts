/**
 * テストのための、localStorage の偽物。本番の道からは参照しない。
 *
 * 歩みの保存と読んだ言葉の記録が、どちらも同じ「使えない環境」を試すので、
 * 偽物は一つにしておく（片方だけ古い偽物で試して、通ったつもりにならないように）。
 */

export type StorageOp = 'get' | 'set' | 'remove';

/** どの操作で投げるかを差し込める。プライベートモードや保存量の上限を写すため */
export function fakeStorage(throwsOn: StorageOp[] = []): Storage {
  const map = new Map<string, string>();
  const guard = (op: StorageOp) => {
    if (throwsOn.includes(op)) throw new Error(`${op} は使えない`);
  };
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    getItem: (k: string) => {
      guard('get');
      return map.get(k) ?? null;
    },
    setItem: (k: string, v: string) => {
      guard('set');
      map.set(k, v);
    },
    removeItem: (k: string) => {
      guard('remove');
      map.delete(k);
    },
  } as Storage;
}
