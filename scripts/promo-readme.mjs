// Gambar promo README ala App Store (1320 x 2868): layar produksi asli di dalam bingkai iPhone 17
// yang digambar sendiri, di atas kartu bento warna-warni, dengan judul Plus Jakarta Sans dan satu
// kata aksen Instrument Serif miring. Hasilnya docs/gambar/promo-*.webp.
//
//   node scripts/promo-readme.mjs [kata-kunci]
//
// Butuh Google Chrome dan dependensi repo (`npm install`). Layarnya diambil dari
// PROMO_BASE_URL (bawaan https://tookthel.vercel.app). Data contoh hanya masuk localStorage
// browser sementara.

import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = fileURLToPath(new URL('..', import.meta.url))
const { chromium } = createRequire(join(REPO, 'package.json'))('@playwright/test')
const BASE = process.env.PROMO_BASE_URL ?? 'https://tookthel.vercel.app'
const WORK = mkdtempSync(join(tmpdir(), 'tookthel-promo-'))
const OUT = join(REPO, 'docs/gambar')
const only = process.argv[2]

// Contoh yang sama dengan tabel "Cara hitung" di README: makan malam berempat, Budi yang bayar duluan.
const bill = {
  title: 'Makan malam',
  people: [
    { id: 'budi', name: 'Budi', color: '#FFB4A2' },
    { id: 'ani', name: 'Ani', color: '#B8E0D2' },
    { id: 'rina', name: 'Rina', color: '#C3B1E1' },
    { id: 'dimas', name: 'Dimas', color: '#FFD97D' },
  ],
  items: [
    { id: 'kepiting', name: 'Kepiting Saus Padang', price: 185000, qty: 1, sharedBy: ['budi', 'ani', 'rina', 'dimas'] },
    { id: 'nasi', name: 'Nasi Putih', price: 8000, qty: 4, sharedBy: ['budi', 'ani', 'rina', 'dimas'] },
    { id: 'jeruk', name: 'Es Jeruk', price: 18000, qty: 2, sharedBy: ['budi', 'rina'] },
    { id: 'udang', name: 'Udang Bakar Madu', price: 98000, qty: 1, sharedBy: ['ani', 'rina', 'dimas'] },
  ],
  charges: { servicePct: 5, taxPct: 10, taxAfterService: true, discount: 0, discountType: 'amount', extraFee: 0, roundTo: 1 },
  payerId: 'budi',
  paymentInfo: 'BCA 1234567890 a.n. Budi',
}

const promos = [
  {
    file: 'promo-1-pesanan',
    screen: 'pesanan',
    title: 'Satu menu,<br>bisa <span class="serif">dibagi</span> rame-rame',
    sub: 'Catat pesanan dan siapa yang makan.<br>Harganya dibagi rata otomatis.',
    tilt: -4,
    logo: { x: 14, y: 1900, w: 190, r: -10 },
  },
  {
    file: 'promo-2-pajak',
    screen: 'pajak',
    title: 'Pajak & service<br><span class="serif">persis struk</span>',
    sub: 'Service, PB1, diskon, dan ongkir<br>dibagi adil ke tiap orang.',
    tilt: 4,
  },
  {
    file: 'promo-3-hasil',
    screen: 'hasil',
    title: 'Jadi tumbal boleh,<br>rugi <span class="serif">jangan</span>',
    sub: 'Pilih siapa yang bayarin dulu,<br>teman tinggal transfer bagiannya.',
    tilt: -4,
  },
  {
    file: 'promo-4-struk',
    screen: 'struk',
    title: 'Cetak struknya,<br><span class="serif">kirim ke grup</span>',
    sub: 'Gambar struk dan rinciannya<br>terkirim sekaligus lewat WhatsApp.',
    tilt: 4,
    logo: { x: 1116, y: 1900, w: 190, r: 10 },
  },
]

const browser = await chromium.launch({ channel: 'chrome' })

// ---------- 1. Layar produksi: iPhone 17 (402 x 874 pt) tanpa status bar 62 pt, @3x ----------

const phone = await browser.newContext({
  viewport: { width: 402, height: 812 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  colorScheme: 'light',
  locale: 'id-ID',
  timezoneId: 'Asia/Jakarta',
})
await phone.addInitScript((saved) => {
  localStorage.setItem('tookthel:v1', saved)
  // Ajakan donasi bertimer tidak ikut terfoto.
  localStorage.setItem('tookthel:donasi:v1', JSON.stringify({ completedBills: 0, lastBillKey: '', dismissedAt: null, donated: true }))
}, JSON.stringify(bill))
const page = await phone.newPage()
await page.clock.setFixedTime(new Date('2026-10-16T19:30:00+07:00'))

const shot = (name) => page.screenshot({ path: join(WORK, `${name}.png`) })
const openStep = async (name, heading) => {
  await page.locator('nav').getByRole('button', { name: new RegExp(name) }).tap()
  await page.getByRole('heading', { level: 2, name: new RegExp(heading) }).waitFor()
  await page.waitForTimeout(1500)
}

// Tagihan berisi pesanan langsung membuka langkah Pesanan.
await page.goto(`${BASE}/`)
await page.getByRole('heading', { level: 2, name: /Pesan/ }).waitFor()
await page.waitForTimeout(1500)
await shot('pesanan')

await openStep('Pajak', 'Pajak')
await shot('pajak')

// Confetti di langkah Hasil ditunggu sampai habis.
await openStep('Hasil', 'Beres')
await page.waitForTimeout(3000)
await shot('hasil')

await page.locator('footer').getByRole('button', { name: 'Bagikan', exact: true }).tap()
const sheet = page.getByRole('dialog', { name: 'Struk patungan' })
await sheet.getByRole('button', { name: 'Cetak struk' }).tap()
await sheet.getByRole('button', { name: 'Bagikan struk' }).waitFor({ timeout: 10_000 })
await page.waitForTimeout(4000)
await shot('struk')
await phone.close()

// ---------- 2. Rakit gambar promo ----------

const LOGO = `data:image/svg+xml;base64,${readFileSync(join(REPO, 'public/logo.svg')).toString('base64')}`

// Ikon status bar iOS, digambar sendiri.
const statusIcons = `
<svg width="18" height="12" viewBox="0 0 18 12"><g fill="#000"><rect x="0" y="7.5" width="3.2" height="4.5" rx="1"/><rect x="4.8" y="5.2" width="3.2" height="6.8" rx="1"/><rect x="9.6" y="2.7" width="3.2" height="9.3" rx="1"/><rect x="14.4" y="0" width="3.2" height="12" rx="1"/></g></svg>
<svg width="16" height="12" viewBox="0 0 16 12"><g fill="none" stroke="#000" stroke-width="2" stroke-linecap="round"><path d="M1.6 4.3a9.2 9.2 0 0 1 12.8 0"/><path d="M4.2 7a5.4 5.4 0 0 1 7.6 0"/></g><circle cx="8" cy="10.1" r="1.6" fill="#000"/></svg>
<svg width="27" height="13" viewBox="0 0 27 13"><rect x="0.6" y="0.6" width="23" height="11.8" rx="3.6" fill="none" stroke="#000" stroke-opacity="0.38" stroke-width="1.2"/><rect x="2.4" y="2.4" width="19.4" height="8.2" rx="2.1" fill="#000"/><path d="M25.2 4.4v4.2c.9-.3 1.5-1.2 1.5-2.1s-.6-1.8-1.5-2.1z" fill="#000" fill-opacity="0.45"/></svg>`

// Potongan confetti di sisi kiri dan kanan HP, dicerminkan untuk promo yang miring ke kanan.
const confetti = [
  { x: 92, y: 760, w: 26, h: 54, r: 24, c: 'var(--coral)' },
  { x: 150, y: 905, w: 30, h: 30, r: 0, c: 'var(--violet)', round: true },
  { x: 60, y: 1540, w: 24, h: 50, r: -32, c: 'var(--butter)' },
  { x: 128, y: 1700, w: 26, h: 26, r: 0, c: 'var(--mint-deep)', round: true },
  { x: 1186, y: 700, w: 28, h: 28, r: 0, c: 'var(--lime-deep)', round: true },
  { x: 1222, y: 860, w: 24, h: 52, r: -20, c: 'var(--violet)' },
  { x: 1170, y: 1320, w: 26, h: 54, r: 36, c: 'var(--coral)' },
  { x: 1236, y: 1480, w: 22, h: 22, r: 0, c: 'var(--butter-deep)', round: true },
]

const style = `
:root { --ink: #141414; --cream: #f6f5f1; --lime: #d4f35b; --lavender: #c3b1e1; --mint: #b8e0d2; --butter: #ffd97d; --coral: #ff7a59; --violet: #7c5cff; --lime-deep: #b9dc2c; --mint-deep: #6fc3a6; --butter-deep: #f5b82e; }
* { box-sizing: border-box; margin: 0; }
html, body { width: 1320px; height: 2868px; overflow: hidden; background: var(--cream); }
body { position: relative; font-family: 'Plus Jakarta Sans', sans-serif; color: var(--ink); -webkit-font-smoothing: antialiased; }
.dots { position: absolute; inset: 0; background-image: radial-gradient(circle, rgba(20, 20, 20, 0.16) 2.4px, transparent 3px); background-size: 36px 36px; background-position: 18px 18px; -webkit-mask-image: radial-gradient(ellipse 80% 62% at 50% 52%, #000 30%, transparent 78%); }
header { position: absolute; top: 150px; left: 0; right: 0; text-align: center; }
h1 { font-weight: 800; font-size: 112px; line-height: 1.06; letter-spacing: -0.045em; }
.serif { font-family: 'Instrument Serif', serif; font-style: italic; font-weight: 400; font-size: 1.22em; letter-spacing: -0.01em; line-height: 0.8; margin: 0 0.06em; }
p.sub { margin-top: 44px; font-weight: 500; font-size: 44px; line-height: 1.42; letter-spacing: -0.01em; color: rgba(20, 20, 20, 0.62); }
.bento { position: absolute; left: 40px; top: 1480px; width: 1240px; height: 1240px; }
.card { position: absolute; border-radius: 84px; box-shadow: 0 26px 40px rgba(20, 20, 20, 0.12), 0 4px 8px rgba(20, 20, 20, 0.06); }
.phone { position: absolute; left: 200px; top: 790px; width: 920px; height: 1944px; border-radius: 142px; background: linear-gradient(150deg, #4a4a52 0%, #26262b 22%, #1a1a1e 50%, #2e2e34 80%, #46464d 100%); box-shadow: 0 60px 90px rgba(20, 20, 20, 0.3), 0 18px 30px rgba(20, 20, 20, 0.18); }
.bezel { position: absolute; inset: 7px; border-radius: 135px; background: #050507; }
.screen { position: absolute; left: 24px; top: 24px; width: 872px; height: 1896px; border-radius: 118px; overflow: hidden; }
.screen-inner { position: absolute; left: 0; top: 0; width: 402px; height: 874px; transform: scale(2.1692); transform-origin: 0 0; }
.bar { position: relative; height: 62px; }
.time { position: absolute; left: 26px; top: 19px; width: 86px; text-align: center; font: 600 17px/22px -apple-system, 'SF Pro Text', sans-serif; letter-spacing: -0.02em; color: #000; }
.icons { position: absolute; right: 25px; top: 23px; display: flex; gap: 6px; align-items: center; }
.shot { display: block; width: 402px; height: 812px; }
.island { position: absolute; left: 50%; top: 24px; width: 274px; height: 80px; margin-left: -137px; border-radius: 40px; background: #000; }
.home { position: absolute; left: 50%; bottom: 18px; width: 300px; height: 11px; margin-left: -150px; border-radius: 6px; background: rgba(0, 0, 0, 0.82); }
.button { position: absolute; width: 12px; border-radius: 4px; background: linear-gradient(90deg, #1e1e22, #4a4a52 60%, #2a2a2f); }
.logo { position: absolute; filter: drop-shadow(0 22px 26px rgba(20, 20, 20, 0.28)) drop-shadow(0 4px 6px rgba(20, 20, 20, 0.14)); }
.bit { position: absolute; border-radius: 6px; }
.bit.round { border-radius: 50%; }`

function html(promo, bar) {
  // Kartu bento di belakang HP; susunannya ikut miring bersama sudut promo.
  const cards = [
    { x: 0, y: 40, w: 600, h: 560, c: 'var(--lime)' },
    { x: 640, y: -60, w: 600, h: 620, c: 'var(--lavender)' },
    { x: 0, y: 640, w: 600, h: 600, c: 'var(--mint)' },
    { x: 640, y: 600, w: 600, h: 560, c: 'var(--butter)' },
  ]
  const flip = promo.tilt > 0
  const bento = cards
    .map((k) => `<div class="card" style="left:${flip ? 1240 - k.x - k.w : k.x}px;top:${k.y}px;width:${k.w}px;height:${k.h}px;background:${k.c}"></div>`)
    .join('')
  const bits = confetti
    .map((b) => {
      const x = flip ? 1320 - b.x - b.w : b.x
      const r = flip ? -b.r : b.r
      return `<span class="bit${b.round ? ' round' : ''}" style="left:${x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;background:${b.c};transform:rotate(${r}deg)"></span>`
    })
    .join('')
  const logo = promo.logo
    ? `<img class="logo" src="${LOGO}" style="left:${promo.logo.x}px;top:${promo.logo.y}px;width:${promo.logo.w}px;transform:rotate(${promo.logo.r}deg)" alt="">`
    : ''
  return `<!doctype html><html lang="id"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@1&family=Plus+Jakarta+Sans:wght@500;800&display=block" rel="stylesheet">
<style>${style}</style></head><body>
<div class="dots"></div>
${bits}
<header><h1>${promo.title}</h1><p class="sub">${promo.sub}</p></header>
<div class="bento" style="transform: rotate(${promo.tilt}deg)">${bento}</div>
<div class="phone">
  <span class="button" style="left:-9px;top:330px;height:96px"></span>
  <span class="button" style="left:-9px;top:480px;height:150px"></span>
  <span class="button" style="left:-9px;top:660px;height:150px"></span>
  <span class="button" style="right:-9px;top:560px;height:230px"></span>
  <div class="bezel"></div>
  <div class="screen" style="background:${bar}">
    <div class="screen-inner">
      <div class="bar" style="background:${bar}"><span class="time">09.41</span><span class="icons">${statusIcons}</span></div>
      <img class="shot" src="file://${join(WORK, `${promo.screen}.png`)}" alt="">
    </div>
    <div class="island"></div>
    <div class="home"></div>
  </div>
</div>
${logo}
</body></html>`
}

const poster = await browser.newPage({ viewport: { width: 1320, height: 2868 } })
for (const promo of promos) {
  if (only && !promo.file.includes(only)) continue
  // Status bar memakai warna baris teratas layarnya.
  const bar = await poster.evaluate(
    async (src) => {
      const image = new Image()
      image.src = src
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 1
      const ctx = canvas.getContext('2d')
      ctx.drawImage(image, 6, 3, 1, 1, 0, 0, 1, 1)
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
      return `rgb(${r}, ${g}, ${b})`
    },
    `data:image/png;base64,${readFileSync(join(WORK, `${promo.screen}.png`)).toString('base64')}`,
  )
  const file = join(WORK, `${promo.file}.html`)
  writeFileSync(file, html(promo, bar))
  await poster.goto(`file://${file}`)
  await poster.evaluate(() => document.fonts.ready)
  await poster.waitForLoadState('networkidle')
  const png = await poster.screenshot()
  // WebP lewat kanvas Chrome, supaya tidak butuh alat lain.
  const webp = await poster.evaluate(
    async (src) => {
      const image = new Image()
      image.src = src
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      canvas.getContext('2d').drawImage(image, 0, 0)
      return canvas.toDataURL('image/webp', 0.9).split(',')[1]
    },
    `data:image/png;base64,${png.toString('base64')}`,
  )
  writeFileSync(join(OUT, `${promo.file}.webp`), Buffer.from(webp, 'base64'))
  console.log(`docs/gambar/${promo.file}.webp`)
}
await browser.close()
