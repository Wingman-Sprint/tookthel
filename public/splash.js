// Memutuskan splash (index.html, src/splash.css) sebelum halaman tergambar, jadi tidak ada kedip.
// Splash dilewati kalau sudah diputar di sesi ini, kalau pengguna meminta gerakan dikurangi, atau kalau
// browser dikendalikan tes otomatis (e2e/splash.spec.ts menimpa navigator.webdriver). Berkas terpisah,
// bukan skrip inline, karena CSP di vercel.json hanya mengizinkan skrip dari Tookthel sendiri.
;(function () {
  var html = document.documentElement
  try {
    if (
      sessionStorage.getItem('tookthel:splash') ||
      navigator.webdriver ||
      matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      html.dataset.splash = 'skip'
    } else {
      sessionStorage.setItem('tookthel:splash', '1')
    }
  } catch {
    html.dataset.splash = 'skip'
  }
})()
