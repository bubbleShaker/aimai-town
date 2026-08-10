/**
 * 保存された素の値を読むときの、共通の見立て。
 *
 * 保存の中身は信用できない（手で書き換わるし、古い形が残る）。
 * その検めを restore と lore が別々に書くと、片方だけ直されて読みが割れる。
 * 「配列を、キーを持つものとして読み違えない」ような判断は一箇所に置く。
 */

/** 配列は除く。JSON の配列を「キーを持つもの」として読み違えないようにするため */
export function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}
