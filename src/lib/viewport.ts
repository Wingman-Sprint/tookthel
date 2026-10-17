type VisualViewportLike = Pick<VisualViewport, 'height' | 'offsetTop' | 'scale'>

/** Visual viewport yang mengecil lebih dari ini dianggap tertutup keyboard, bukan bilah alamat browser. */
const KEYBOARD_MIN = 120

/**
 * Area yang terlihat di atas keyboard virtual, dalam koordinat layout viewport. Di iPhone Safari keyboard
 * hanya mengecilkan visual viewport, jadi elemen `fixed` di bawah tertutup keyboard. Kalau Safari juga
 * menggeser tampilan (`offsetTop`), dasar area yang terlihat ikut naik.
 *
 * `bottom` adalah jarak dari dasar layout viewport ke dasar area yang terlihat, dan `height` tinggi area itu.
 * Hasilnya `null` kalau keyboard tertutup, atau kalau visual viewport mengecil karena di-zoom.
 */
export function keyboardInset(innerHeight: number, vv: VisualViewportLike): { bottom: number; height: number } | null {
  if (vv.scale > 1.01 || innerHeight - vv.height < KEYBOARD_MIN) return null
  return { bottom: Math.max(0, Math.round(innerHeight - vv.height - vv.offsetTop)), height: Math.round(vv.height) }
}
