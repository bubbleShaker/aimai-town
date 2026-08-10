/** 下端に着いているとみなす距離（px）。一行の高さに満たない程度 */
const NEAR_BOTTOM_PX = 24;

/**
 * 積み上がる言葉の下端に着いているか。
 *
 * 着いていれば新しい言葉を追い、離れていれば読み返しの邪魔をしない。
 * 判じるのは「動いた先がどこか」だけにする。指もホイールも矢印キーも
 * つまみのドラッグも、位置が動けばここへ落ちてくるので取りこぼしが無い。
 * 入力の種類で見分けようとすると、位置の動かない入力で追うのをやめたきり、
 * 戻す報せが来ないまま固まる。
 */
export function isAtBottom(scrollHeight: number, scrollTop: number, clientHeight: number): boolean {
  return scrollHeight - scrollTop - clientHeight < NEAR_BOTTOM_PX;
}
