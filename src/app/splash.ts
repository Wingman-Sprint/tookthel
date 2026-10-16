/** Batas cadangan kalau browser tidak bisa membaca animasi CSS: animasi keluarnya selesai di 2,8 detik. */
const SPLASH_MS = 2800

/**
 * Splash di awal sesi. Markupnya di index.html dan animasinya CSS (src/splash.css), jadi sudah berjalan
 * sebelum JavaScript dimuat. public/splash.js memutuskan tampil atau tidak sebelum halaman tergambar.
 * Di sini splash dilepas dari halaman setelah animasi keluarnya selesai, atau lebih cepat kalau
 * pengguna mengetuk atau menekan tombol apa pun.
 */
export function startSplash() {
  const splash = document.getElementById('splash')
  if (!splash) return
  if (document.documentElement.dataset.splash === 'skip') return splash.remove()

  const done = () => {
    splash.remove()
    removeEventListener('keydown', skip)
  }
  // Dilewati lewat `click`, bukan `pointerdown`: seluruh ketukan jatuh ke splash, jadi tidak ikut
  // menekan tombol di halaman di bawahnya.
  const skip = () => {
    if (splash.classList.contains('is-leaving')) return
    splash.classList.add('is-leaving')
    setTimeout(done, 250)
  }

  const exit = splash.getAnimations?.().find((a) => a instanceof CSSAnimation && a.animationName === 'splash-out')
  // Kalau JavaScript baru siap setelah animasinya habis, `finished` langsung selesai. Kalau splash
  // dilewati, animasi ini diganti dan janjinya ditolak; pelepasannya diurus `skip`.
  if (exit) exit.finished.then(done, () => {})
  else setTimeout(done, SPLASH_MS)
  splash.addEventListener('click', skip)
  addEventListener('keydown', skip)
}
