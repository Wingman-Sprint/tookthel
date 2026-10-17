import { expect, test, type Locator, type Page } from '@playwright/test'

type NewItem = { name: string; price: number; qty?: number; who: string[] | 'semua' }

// Saat transisi, judul langkah lama dan baru sempat tampil bersamaan, jadi cari judul yang spesifik.
const expectStep = (page: Page, title: string) => expect(page.getByRole('heading', { level: 2, name: new RegExp(title) })).toBeVisible()
const next = (page: Page) => page.getByRole('button', { name: /Lanjut|Lihat hasil/ }).click()
const openStep = (page: Page, name: string) => page.locator('nav').getByRole('button', { name: new RegExp(name) }).click()

async function addPeople(page: Page, ...names: string[]) {
  const input = page.getByPlaceholder('Ketik nama teman…')
  for (const name of names) {
    await input.fill(name)
    await input.press('Enter')
  }
}

async function addItem(page: Page, { name, price, qty = 1, who }: NewItem) {
  await page.getByRole('button', { name: 'Tambah pesanan' }).click()
  const sheet = page.getByRole('dialog')
  await sheet.getByLabel('Nama menu').fill(name)
  await sheet.getByLabel('Harga satuan').fill(String(price))
  for (let i = 1; i < qty; i++) await sheet.getByRole('button', { name: 'Tambah jumlah' }).click()
  if (who === 'semua') await sheet.getByRole('button', { name: 'Semua' }).click()
  else for (const w of who) await sheet.getByRole('button', { name: w, exact: true }).click()
  await sheet.getByRole('button', { name: /^Tambahkan/ }).click()
  await expect(sheet).toBeHidden()
}

/** Isi tagihan langsung lewat localStorage untuk skenario yang tidak menguji pengisian awal. */
async function seed(page: Page) {
  await page.goto('/')
  await page.evaluate(() =>
    localStorage.setItem(
      'tookthel:v1',
      JSON.stringify({
        title: '',
        people: [
          { id: 'a', name: 'Budi', color: '#FFB4A2' },
          { id: 'b', name: 'Ani', color: '#B8E0D2' },
        ],
        items: [{ id: 'x', name: 'Iga Bakar', price: 100000, qty: 1, sharedBy: ['a', 'b'] }],
        charges: { servicePct: 5, taxPct: 10, taxAfterService: true, discount: 0, discountType: 'amount', extraFee: 0 },
        payerId: 'a',
      }),
    ),
  )
  await page.reload()
}

/** Buka halaman struk dari tombol Bagikan lalu cetak; mengembalikan sheet-nya. */
async function printReceipt(page: Page) {
  await page.locator('footer').getByRole('button', { name: 'Bagikan', exact: true }).click()
  const sheet = page.getByRole('dialog', { name: 'Struk patungan' })
  await sheet.getByRole('button', { name: 'Cetak struk' }).click()
  await expect(sheet.getByRole('button', { name: 'Bagikan struk' })).toBeVisible({ timeout: 10_000 })
  return sheet
}

async function readShared(page: Page) {
  // Skenario ini hanya memeriksa teks, jadi animasi cetak dilewati (sudah dites di skenario bagikan struk).
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const sheet = await printReceipt(page)
  await sheet.getByRole('button', { name: 'Salin teks' }).click()
  await expect(page.getByText('Rincian disalin')).toBeVisible()
  return page.evaluate(() => navigator.clipboard.readText())
}

/** Geser dari tengah elemen ke bawah, seperti jempol di HP. Vaul baru menerima geseran setelah animasi buka selesai. */
async function dragDown(page: Page, target: Locator, distance = 300) {
  await page.waitForTimeout(600)
  const box = (await target.boundingBox())!
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  for (let dy = 20; dy <= distance; dy += 20) await page.mouse.move(x, y + dy)
  await page.mouse.up()
}

test.beforeEach(async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  // Paksa jalur unduh + salin seperti di laptop. Skenario share HP mengganti keduanya lagi.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
    Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true })
    // Ajakan donasi bertimer bisa muncul di tengah skenario lain, jadi anggap sudah donasi.
    // Skenario ajakan donasi menimpanya lewat seedDonation.
    if (!localStorage.getItem('tookthel:donasi:v1')) {
      localStorage.setItem('tookthel:donasi:v1', JSON.stringify({ completedBills: 0, lastBillKey: '', dismissedAt: null, donated: true }))
    }
  })
})

test('alur lengkap: teman → pesanan → pajak → hasil → bagikan', async ({ page }) => {
  // Skenario terpanjang (3 teman, 3 menu, 4 langkah, lalu cetak struk). Saat laptop sibuk dan trace
  // merekam, durasinya bisa mendekati batas 30 detik, jadi batasnya dinaikkan 3×.
  test.slow()
  await page.goto('/')

  await addPeople(page, 'Budi', 'Ani', 'Rina')
  // Orang pertama otomatis jadi tumbal (yang bayar duluan).
  await expect(page.getByRole('listitem').filter({ hasText: 'Budi' }).getByText('Tumbal', { exact: true })).toBeVisible()
  await next(page)
  await expectStep(page, 'Pesan')

  await addItem(page, { name: 'Nasi Goreng', price: 25000, qty: 2, who: ['Budi', 'Ani'] })
  await addItem(page, { name: 'Es Teh', price: 5000, qty: 3, who: 'semua' })
  await addItem(page, { name: 'Ayam Bakar', price: 40000, who: ['Rina'] })
  await expect(page.getByText('Subtotal (3 menu)')).toBeVisible()
  await expect(page.getByRole('button', { name: /Ayam Bakar/ })).toContainText('Rina')
  // Sebelum pajak diatur, bar bawah menampilkan subtotal yang sama dengan daftar pesanan.
  await expect(page.locator('footer')).toContainText('Subtotal')
  await expect(page.locator('footer')).toContainText('Rp 105.000')

  await next(page)
  await expectStep(page, 'Pajak')
  await expect(page.locator('footer').getByText('Total', { exact: true })).toBeVisible()
  await expect(page.locator('footer')).toContainText('Rp 121.275')

  await next(page)
  await expectStep(page, 'Beres')
  await expect(page.locator('footer').getByText('Total', { exact: true })).toBeVisible()
  await expect(page.getByText('Siapa tumbalnya?')).toBeVisible()
  await expect(page.getByText('Tumbal hari ini')).toBeVisible()

  const shared = await readShared(page)
  expect(shared).toContain('Patungan: total Rp 121.275, Budi jadi tumbal yang bayarin dulu.')
  expect(shared).toContain('- Ani: Rp 34.650')
  expect(shared).toContain('- Rina: Rp 51.975')
  expect(shared).toContain('(Bagian Budi sendiri Rp 34.650)')
})

test('tidak bisa lanjut sebelum ada minimal 2 orang', async ({ page }) => {
  await page.goto('/')
  await addPeople(page, 'Budi')
  await next(page)
  await expect(page.getByText('Tambah minimal 2 orang dulu')).toBeVisible()
  await expectStep(page, 'ikut makan')
})

test('pesanan tanpa pemilik ditandai dan menahan langkah pajak', async ({ page }) => {
  await page.goto('/')
  await addPeople(page, 'Budi', 'Ani', 'Rina')
  await next(page)
  await addItem(page, { name: 'Sate', price: 30000, who: ['Budi'] })

  await page.getByRole('button', { name: 'Kembali' }).click()
  await page.getByRole('button', { name: 'Hapus Budi' }).click()
  await next(page)
  await expect(page.getByText('Belum ada yang pesan', { exact: true })).toBeVisible()
  // Alasan langkah Pajak tertahan sudah terlihat sebelum pengguna menekan Lanjut.
  const notice = page.locator('main').getByRole('status')
  await expect(notice).toContainText('1 pesanan belum ada yang pesan')

  await next(page)
  await expect(page.locator('[data-sonner-toast]').getByText('1 pesanan belum ada yang pesan')).toBeVisible()
  await expectStep(page, 'Pesan')

  // Setelah pemesannya dipilih lagi, pemberitahuannya hilang dan langkah Pajak terbuka.
  await page.getByRole('button', { name: /Sate/ }).click()
  const sheet = page.getByRole('dialog')
  await sheet.getByRole('button', { name: 'Ani', exact: true }).click()
  await sheet.getByRole('button', { name: /^Simpan/ }).click()
  await expect(notice).toBeHidden()
  await next(page)
  await expectStep(page, 'Pajak')
})

test('data tetap ada setelah halaman dimuat ulang', async ({ page }) => {
  await page.goto('/')
  await addPeople(page, 'Budi', 'Ani')
  await next(page)
  await addItem(page, { name: 'Bakso', price: 20000, who: 'semua' })

  await page.reload()
  await expectStep(page, 'Pesan')
  await expect(page.getByRole('button', { name: /Bakso/ })).toBeVisible()
})

test('hapus pesanan bisa diurungkan', async ({ page }) => {
  await page.goto('/')
  await addPeople(page, 'Budi', 'Ani')
  await next(page)
  await addItem(page, { name: 'Bakso', price: 20000, who: 'semua' })

  await page.getByRole('button', { name: /Bakso/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Hapus pesanan' }).click()
  await expect(page.getByRole('button', { name: /Bakso/ })).toHaveCount(0)

  await page.getByRole('button', { name: 'Urungkan' }).click()
  await expect(page.getByRole('button', { name: /Bakso/ })).toBeVisible()
})

test('urungkan reset mengembalikan data dan langkah terakhir', async ({ page }) => {
  await page.goto('/')
  await addPeople(page, 'Budi', 'Ani')
  await next(page)
  await addItem(page, { name: 'Bakso', price: 20000, who: 'semua' })

  await page.getByRole('button', { name: 'Kosongkan tagihan' }).click()
  await expect(page.getByText('Belum ada yang ikut nih')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Kosongkan tagihan' })).toBeDisabled()

  await page.getByRole('button', { name: 'Urungkan' }).click()
  await expectStep(page, 'Pesan')
  await expect(page.getByRole('button', { name: /Bakso/ })).toBeVisible()
  await expect(page.locator('footer')).toContainText('Rp 20.000')
})

test('service, diskon, ongkir, dan urutan pajak bisa diatur lewat input berlabel', async ({ page }) => {
  await seed(page)
  await openStep(page, 'Pajak')

  await page.getByRole('button', { name: 'Service 10%' }).click()
  await page.getByLabel('Diskon (Rp)').fill('20000')
  await page.getByLabel('Ongkir atau biaya lain').fill('10000')
  // (100.000 − 20.000) + service 10% + pajak 10% dari (80.000 + 8.000) + ongkir 10.000
  await expect(page.locator('footer')).toContainText('Rp 106.800')

  await page.getByRole('switch', { name: /Pajak dihitung setelah service/ }).click()
  await expect(page.getByRole('switch', { name: /Pajak dihitung setelah service/ })).toHaveAttribute('aria-checked', 'false')
  await expect(page.locator('footer')).toContainText('Rp 106.000')

  await next(page)
  const shared = await readShared(page)
  expect(shared).toContain('Sudah termasuk service 10%, pajak 10%, dan biaya lain Rp 10.000. Sudah dipotong diskon Rp 20.000.')
})

test('service dan pajak bisa diisi nominal Rp sesuai struk', async ({ page }) => {
  await seed(page)
  await openStep(page, 'Pajak')
  const unit = (name: string, value: 'Rp' | '%') =>
    page.getByRole('group', { name: `Satuan ${name}` }).getByRole('button', { name: value, exact: true }).click()
  const afterService = page.getByRole('switch', { name: /Pajak dihitung setelah service/ })

  // Iga Bakar 100.000 + service Rp 7.000 + pajak 10% dari 107.000
  await unit('service', 'Rp')
  await page.getByLabel('Service (Rp)').fill('7000')
  await expect(page.locator('footer')).toContainText('Rp 117.700')

  // Pajak nominal sudah final dari struk, jadi saklar urutan pajak disembunyikan.
  await unit('pajak', 'Rp')
  await expect(afterService).toBeHidden()
  await page.getByLabel('Pajak (Rp)').fill('11000')
  await expect(page.locator('footer')).toContainText('Rp 118.000')

  // Kembali ke persen memakai lagi angka persen sebelumnya.
  await unit('service', '%')
  await expect(page.getByLabel('Service (%)')).toHaveValue('5')
  await expect(page.locator('footer')).toContainText('Rp 116.000')

  // Pilihan nominal ikut tersimpan setelah aplikasi dibuka ulang.
  await page.reload()
  await openStep(page, 'Pajak')
  await expect(page.getByLabel('Pajak (Rp)')).toHaveValue('11.000')
  await expect(afterService).toBeHidden()

  await next(page)
  const shared = await readShared(page)
  expect(shared).toContain('Sudah termasuk service 5% dan pajak Rp 11.000.')
})

test('pembulatan per orang menggeser selisih ke pembayar dan ikut dibagikan', async ({ page }) => {
  await seed(page)
  await openStep(page, 'Pajak')

  // Iga Bakar 100.000 dibagi 2 + service 5% + pajak 10% = 57.750 per orang
  await page.getByRole('button', { name: '1rb', exact: true }).click()
  await expect(page.getByRole('button', { name: '1rb', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('footer')).toContainText('Rp 115.500')

  await next(page)
  const shared = await readShared(page)
  expect(shared).toContain('(Bagian Budi sendiri Rp 57.500)')
  expect(shared).toContain('- Ani: Rp 58.000')
  expect(shared).toContain('Dibulatkan ke Rp 1.000, selisihnya ke Budi.')
})

test('confetti muncul sekali per isi tagihan, tidak setiap balik ke Hasil', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { confettiCanvasCount: number }
    w.confettiCanvasCount = 0
    new MutationObserver((ms) =>
      ms.forEach((m) => m.addedNodes.forEach((n) => n.nodeName === 'CANVAS' && w.confettiCanvasCount++)),
    ).observe(document, { childList: true, subtree: true })
  })
  const confettiCount = () => page.evaluate(() => (window as unknown as { confettiCanvasCount: number }).confettiCanvasCount)
  const confettiDone = () => expect(page.locator('canvas')).toHaveCount(0, { timeout: 10_000 })

  await seed(page)
  await openStep(page, 'Hasil')
  await expect.poll(confettiCount).toBe(1)
  await confettiDone()

  await openStep(page, 'Pajak')
  await openStep(page, 'Hasil')
  await expectStep(page, 'Beres')
  await page.waitForTimeout(500)
  expect(await confettiCount()).toBe(1)

  await openStep(page, 'Pajak')
  await page.getByRole('button', { name: 'Pajak 11%' }).click()
  await openStep(page, 'Hasil')
  await expect.poll(confettiCount).toBe(2)
})

test('simpan & tambah menu lain tanpa menutup sheet', async ({ page }) => {
  await page.goto('/')
  await addPeople(page, 'Budi', 'Ani')
  await next(page)

  await page.getByRole('button', { name: 'Tambah pesanan' }).click()
  const sheet = page.getByRole('dialog')
  await sheet.getByLabel('Nama menu').fill('Kopi Susu')
  await sheet.getByLabel('Harga satuan').fill('18000')
  await sheet.getByRole('button', { name: 'Budi', exact: true }).click()
  await sheet.getByRole('button', { name: /Simpan & tambah menu lain/ }).click()

  // Sheet tetap terbuka dengan form kosong dan kursor siap di nama menu.
  await expect(sheet).toBeVisible()
  await expect(sheet.getByLabel('Nama menu')).toHaveValue('')
  await expect(sheet.getByLabel('Nama menu')).toBeFocused()

  await sheet.getByLabel('Nama menu').fill('Roti Bakar')
  await sheet.getByLabel('Harga satuan').fill('22000')
  await sheet.getByRole('button', { name: 'Ani', exact: true }).click()
  await sheet.getByRole('button', { name: /^Tambahkan/ }).click()

  await expect(sheet).toBeHidden()
  await expect(page.getByText('Subtotal (2 menu)')).toBeVisible()
  await expect(page.getByRole('button', { name: /Kopi Susu/ })).toContainText('Budi')
  await expect(page.getByRole('button', { name: /Roti Bakar/ })).toContainText('Ani')
})

test.describe('sheet pesanan', () => {
  test('menggeser isi sheet hanya menggulir, menggeser judulnya menutup sheet', async ({ page }) => {
    await seed(page)
    await page.getByRole('button', { name: 'Tambah pesanan' }).click()
    const sheet = page.getByRole('dialog', { name: 'Pesanan baru' })
    await dragDown(page, sheet.getByText('Siapa yang pesan?'))
    await page.waitForTimeout(600)
    await expect(sheet).toBeVisible()

    await dragDown(page, sheet.getByRole('heading', { name: 'Pesanan baru' }))
    await expect(sheet).toBeHidden()
  })

  test('pesanan baru yang tertutup sebelum disimpan bisa dilanjutkan', async ({ page }) => {
    await seed(page)
    await page.getByRole('button', { name: 'Tambah pesanan' }).click()
    const sheet = page.getByRole('dialog', { name: 'Pesanan baru' })
    await sheet.getByLabel('Nama menu').fill('Es Teh')
    await sheet.getByLabel('Harga satuan').fill('5000')
    await sheet.getByRole('button', { name: 'Tutup' }).click()
    await expect(sheet).toBeHidden()

    await page.getByRole('button', { name: 'Lanjutkan' }).click()
    await expect(sheet.getByLabel('Nama menu')).toHaveValue('Es Teh')
    await expect(sheet.getByLabel('Harga satuan')).toHaveValue('5.000')

    // Kalau notifikasinya terlewat, tombol Tambah pesanan juga melanjutkan isian yang sama.
    await page.keyboard.press('Escape')
    await expect(sheet).toBeHidden()
    await page.getByRole('button', { name: 'Tambah pesanan' }).click()
    await expect(sheet.getByLabel('Nama menu')).toHaveValue('Es Teh')
    await sheet.getByRole('button', { name: 'Semua' }).click()
    await sheet.getByRole('button', { name: /^Tambahkan/ }).click()
    await expect(sheet).toBeHidden()
    await expect(page.getByText('Subtotal (2 menu)')).toBeVisible()

    // Setelah disimpan, pesanan berikutnya mulai dari form kosong.
    await page.getByRole('button', { name: 'Tambah pesanan' }).click()
    await expect(sheet.getByLabel('Nama menu')).toHaveValue('')
  })

  test('menutup pesanan baru yang masih kosong tidak memunculkan notifikasi', async ({ page }) => {
    await seed(page)
    await page.getByRole('button', { name: 'Tambah pesanan' }).click()
    const sheet = page.getByRole('dialog', { name: 'Pesanan baru' })
    await sheet.getByRole('button', { name: 'Tutup' }).click()
    await expect(sheet).toBeHidden()
    await expect(page.getByText('Pesanan belum disimpan')).toHaveCount(0)
  })

  test('mengubah pesanan lalu menutup sheet tidak menyimpan perubahan, tapi bisa dilanjutkan', async ({ page }) => {
    await seed(page)
    const item = page.getByRole('button', { name: /Iga Bakar/ })
    await item.click()
    const sheet = page.getByRole('dialog', { name: 'Ubah pesanan' })
    await sheet.getByLabel('Nama menu').fill('Iga Bakar Madu')
    await page.keyboard.press('Escape')
    await expect(sheet).toBeHidden()
    await expect(item).not.toContainText('Madu')

    await expect(page.getByText('Perubahan belum disimpan')).toBeVisible()
    await page.getByRole('button', { name: 'Lanjutkan' }).click()
    await expect(sheet.getByLabel('Nama menu')).toHaveValue('Iga Bakar Madu')
  })
})

test.describe('keyboard HP', () => {
  type KeyboardWindow = { keyboard: (height: number, offsetTop: number) => void }

  test.beforeEach(async ({ page }) => {
    // Browser tes tidak punya keyboard virtual, jadi visualViewport ditiru seperti iPhone Safari: keyboard
    // hanya mengecilkan area yang terlihat, dan Safari bisa menggeser tampilan ke atas.
    await page.addInitScript(() => {
      const vv = Object.assign(new EventTarget(), { width: innerWidth, height: innerHeight, offsetLeft: 0, offsetTop: 0, pageLeft: 0, pageTop: 0, scale: 1 })
      Object.defineProperty(window, 'visualViewport', { value: vv, configurable: true })
      ;(window as unknown as KeyboardWindow).keyboard = (height, offsetTop) => {
        Object.assign(vv, { height: innerHeight - height, offsetTop })
        vv.dispatchEvent(new Event('resize'))
      }
    })
  })

  test('sheet pesanan naik ke atas keyboard, dan isian yang diketik tetap terlihat', async ({ page }) => {
    await seed(page)
    await page.getByRole('button', { name: 'Tambah pesanan' }).click()
    const sheet = page.getByRole('dialog')
    const name = sheet.getByLabel('Nama menu')
    await expect(name).toBeFocused()
    // Keyboard 336 px, dan Safari menggeser tampilan 120 px seperti di video laporan pengguna.
    await page.evaluate(() => (window as unknown as KeyboardWindow).keyboard(336, 120))
    await name.fill('Nasi Goreng')

    const visible = await page.evaluate(() => ({ top: 120, bottom: 120 + innerHeight - 336 }))
    await expect(async () => {
      const box = (await sheet.boundingBox())!
      expect(box.y).toBeGreaterThanOrEqual(visible.top)
      expect(box.y + box.height).toBeLessThanOrEqual(visible.bottom + 1)
      const field = (await name.boundingBox())!
      expect(field.y).toBeGreaterThanOrEqual(visible.top)
      expect(field.y + field.height).toBeLessThanOrEqual(visible.bottom)
    }).toPass()
    await expect(name).toHaveValue('Nasi Goreng')
  })

  test('menggeser isi sheet saat keyboard terbuka tidak menutup sheet', async ({ page }) => {
    await seed(page)
    await page.getByRole('button', { name: 'Tambah pesanan' }).click()
    const sheet = page.getByRole('dialog')
    await expect(sheet.getByLabel('Nama menu')).toBeFocused()
    await page.evaluate(() => (window as unknown as KeyboardWindow).keyboard(336, 0))
    await dragDown(page, sheet.getByText('Siapa yang pesan?'))
    await page.waitForTimeout(600)
    await expect(sheet).toBeVisible()
  })
})

test('isian di sheet pesanan punya label yang tetap terlihat setelah diisi', async ({ page }) => {
  await seed(page)
  await page.getByRole('button', { name: 'Tambah pesanan' }).click()
  const sheet = page.getByRole('dialog')
  await sheet.getByLabel('Nama menu').fill('Kopi Susu')
  await sheet.getByLabel('Harga satuan').fill('18000')

  for (const label of ['Nama menu', 'Harga satuan', 'Jumlah']) {
    await expect(sheet.getByText(label, { exact: true })).toBeVisible()
  }
  // Mengetuk label memindahkan kursor ke isiannya.
  await sheet.getByText('Harga satuan', { exact: true }).click()
  await expect(sheet.getByLabel('Harga satuan')).toBeFocused()
})

test('info rekening pembayar ikut dibagikan dan tetap tersimpan', async ({ page }) => {
  await seed(page)
  await openStep(page, 'Hasil')

  const info = page.getByLabel('Rekening atau e-wallet pembayar')
  await info.fill('BCA 1234567890 a.n. Budi')
  const shared = await readShared(page)
  expect(shared).toContain('Patungan: total Rp 115.500, Budi jadi tumbal yang bayarin dulu.\n\nTransfer ke Budi ya:\nBCA 1234567890 a.n. Budi')

  await page.reload()
  await openStep(page, 'Hasil')
  await expect(page.getByLabel('Rekening atau e-wallet pembayar')).toHaveValue('BCA 1234567890 a.n. Budi')
})

test('bagikan mencetak struk, lalu gambar diunduh dan teks disalin di perangkat tanpa share file', async ({ page }) => {
  await seed(page)
  await openStep(page, 'Hasil')
  const sheet = await printReceipt(page)
  // Struk berupa gambar yang sama dengan yang dibagikan; isinya diringkas di alt.
  await expect(sheet.getByRole('img', { name: 'Struk Patungan: total Rp 115.500, Budi jadi tumbal yang bayarin dulu, 2 orang.' })).toBeVisible()

  const download = page.waitForEvent('download')
  await sheet.getByRole('button', { name: 'Bagikan struk' }).click()
  expect((await download).suggestedFilename()).toBe('struk-patungan.png')

  await expect(page.getByText('Gambar struk tersimpan')).toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('Patungan: total Rp 115.500, Budi jadi tumbal yang bayarin dulu.')
})

test('di HP yang bisa berbagi file, gambar struk dan teks terkirim bersama', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { shared?: unknown }
    Object.defineProperty(navigator, 'canShare', { value: (d: ShareData) => !!d.files?.length, configurable: true })
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (d: ShareData) => {
        const f = d.files![0]
        const bytes = new Uint8Array(await f.arrayBuffer())
        // Tanda tangan PNG di byte 1–3, lebar gambar di byte 16–19.
        const png = String.fromCharCode(...bytes.slice(1, 4))
        const width = new DataView(bytes.buffer).getUint32(16)
        w.shared = { count: d.files!.length, name: f.name, type: f.type, png, width, text: d.text }
      },
    })
  })
  await seed(page)
  await openStep(page, 'Hasil')
  const sheet = await printReceipt(page)
  await sheet.getByRole('button', { name: 'Bagikan struk' }).click()

  const shared = await page.waitForFunction(() => (window as unknown as { shared?: unknown }).shared).then((h) => h.jsonValue())
  expect(shared).toMatchObject({ count: 1, name: 'struk-patungan.png', type: 'image/png', png: 'PNG' })
  // Digambar 3× supaya tajam di HP.
  expect((shared as { width: number }).width).toBeGreaterThanOrEqual(900)
  expect((shared as { text: string }).text).toContain('Transfer ke Budi ya:')
})

test('dengan reduced motion struk langsung jadi tanpa animasi cetak', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await seed(page)
  await openStep(page, 'Hasil')
  await page.locator('footer').getByRole('button', { name: 'Bagikan', exact: true }).click()
  const sheet = page.getByRole('dialog', { name: 'Struk patungan' })
  await sheet.getByRole('button', { name: 'Cetak struk' }).click()
  await expect(sheet.getByRole('button', { name: 'Bagikan struk' })).toBeVisible({ timeout: 1000 })
})

test.describe('layar kecil (320 px)', () => {
  test.use({ viewport: { width: 320, height: 568 } })

  test('total di bar bawah tidak terpotong', async ({ page }) => {
    await seed(page)
    for (const step of ['Pajak', 'Hasil']) {
      await openStep(page, step)
      const amount = page.locator('footer').getByText('Rp 115.500')
      await expect(amount).toBeVisible()
      const clipped = await amount.evaluate((el) => el.scrollWidth > el.clientWidth + 1)
      expect(clipped, `total terpotong di langkah ${step}`).toBe(false)
    }
  })
})

const askDonation = (page: Page) => page.getByRole('dialog', { name: 'Traktir kopi?' })
/** Buka lalu tutup halaman struk, momen ajakan donasi boleh muncul. */
async function shareAndClose(page: Page) {
  await page.locator('footer').getByRole('button', { name: 'Bagikan', exact: true }).click()
  const sheet = page.getByRole('dialog', { name: 'Struk patungan' })
  await expect(sheet).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(sheet).toBeHidden()
}
/** Anggap pengguna sudah menyelesaikan beberapa tagihan lain sebelumnya dan belum pernah donasi. */
async function seedDonation(page: Page, completedBills: number) {
  await seed(page)
  await page.evaluate(
    (count) =>
      localStorage.setItem('tookthel:donasi:v1', JSON.stringify({ completedBills: count, lastBillKey: '', dismissedAt: null, donated: false })),
    completedBills,
  )
  await page.reload()
  await openStep(page, 'Hasil')
}

test.describe('ajakan donasi', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
  })

  test('belum muncul sebelum tagihan ke-3', async ({ page }) => {
    await seedDonation(page, 1)
    await shareAndClose(page)
    await page.waitForTimeout(800)
    await expect(askDonation(page)).toBeHidden()
  })

  test('muncul setelah struk ditutup, dan setelah "Nanti aja" tidak muncul lagi', async ({ page }) => {
    await seedDonation(page, 2)
    await shareAndClose(page)
    await expect(askDonation(page)).toBeVisible()
    await expect(askDonation(page).getByRole('link', { name: /Dukung di Sociabuzz/ })).toHaveAttribute('href', 'https://sociabuzz.com/byhund/tribe')

    await askDonation(page).getByRole('button', { name: 'Nanti aja' }).click()
    await expect(askDonation(page)).toBeHidden()
    await shareAndClose(page)
    await page.waitForTimeout(800)
    await expect(askDonation(page)).toBeHidden()
  })

  test('setelah link donasi dibuka, ajakan tidak pernah muncul lagi', async ({ page, context }) => {
    await context.route('https://sociabuzz.com/**', (route) => route.fulfill({ body: 'ok' }))
    await seedDonation(page, 2)
    await shareAndClose(page)

    const tab = context.waitForEvent('page')
    await askDonation(page).getByRole('link', { name: /Dukung di Sociabuzz/ }).click()
    expect((await tab).url()).toBe('https://sociabuzz.com/byhund/tribe')
    await expect(askDonation(page)).toBeHidden()

    // Jeda 30 hari pun sudah lewat, tetap tidak ditanya lagi.
    await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('tookthel:donasi:v1')!)
      localStorage.setItem('tookthel:donasi:v1', JSON.stringify({ ...s, dismissedAt: 0 }))
    })
    await page.reload()
    await openStep(page, 'Hasil')
    await shareAndClose(page)
    await page.waitForTimeout(800)
    await expect(askDonation(page)).toBeHidden()
  })

  test('link "Traktir kopi" selalu ada di bawah langkah Hasil', async ({ page }) => {
    await seedDonation(page, 0)
    await expect(page.locator('main').getByRole('link', { name: /Traktir kopi/ })).toHaveAttribute('href', 'https://sociabuzz.com/byhund/tribe')
  })
})

test.describe('ajakan donasi bertimer', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.clock.install()
  })

  test('muncul 5 detik setelah Hasil tampil lalu tertutup sendiri setelah 10 detik', async ({ page }) => {
    await seedDonation(page, 0)
    await page.clock.runFor(4000)
    await expect(askDonation(page)).toBeHidden()

    await page.clock.runFor(1000)
    await expect(askDonation(page)).toBeVisible()
    await expect(askDonation(page).getByText('Tertutup sendiri dalam 10 detik')).toBeVisible()
    await page.clock.runFor(3000)
    await expect(askDonation(page).getByText('Tertutup sendiri dalam 7 detik')).toBeVisible()

    await page.clock.runFor(7000)
    // Beri waktu untuk animasi tutup sheet.
    await page.clock.runFor(1000)
    await expect(askDonation(page)).toBeHidden()
    // Sekali per isi tagihan, jadi bolak-balik ke Hasil tidak memunculkannya lagi.
    await openStep(page, 'Pajak')
    await openStep(page, 'Hasil')
    await page.clock.runFor(6000)
    await expect(askDonation(page)).toBeHidden()
  })

  test('bisa ditutup sebelum waktunya habis', async ({ page }) => {
    await seedDonation(page, 0)
    await page.clock.runFor(5000)
    await askDonation(page).getByRole('button', { name: 'Nanti aja' }).click()
    await expect(askDonation(page)).toBeHidden()
  })

  test('batal kalau pengguna keburu pindah dari Hasil', async ({ page }) => {
    await seedDonation(page, 0)
    await page.clock.runFor(3000)
    await openStep(page, 'Pajak')
    await page.clock.runFor(5000)
    await expect(askDonation(page)).toBeHidden()
  })
})

test.describe('keamanan', () => {
  test('halaman, aset, dan service worker membawa header keamanan', async ({ request }) => {
    for (const path of ['/', '/sw.js', '/manifest.webmanifest', '/logo.svg']) {
      const headers = (await request.get(path)).headers()
      expect(headers['content-security-policy'], path).toContain("frame-ancestors 'none'")
      expect(headers['x-frame-options'], path).toBe('DENY')
      expect(headers['x-content-type-options'], path).toBe('nosniff')
    }
  })

  test('struk dicetak dan dibagikan tanpa pelanggaran CSP dan tanpa request ke situs lain', async ({ page, baseURL }) => {
    const outside: string[] = []
    page.on('request', (r) => {
      if (!/^(data|blob):/.test(r.url()) && !r.url().startsWith(baseURL!)) outside.push(r.url())
    })
    await page.addInitScript(() => {
      const w = window as unknown as { csp: string[] }
      w.csp = []
      document.addEventListener('securitypolicyviolation', (e) => w.csp.push(`${e.effectiveDirective} ${e.blockedURI}`))
    })
    await seed(page)
    await openStep(page, 'Hasil')
    const sheet = await printReceipt(page)
    const download = page.waitForEvent('download')
    await sheet.getByRole('button', { name: 'Bagikan struk' }).click()
    await download
    await expect(page.getByText('Gambar struk tersimpan')).toBeVisible()

    expect(await page.evaluate(() => (window as unknown as { csp: string[] }).csp)).toEqual([])
    expect(outside).toEqual([])
  })
})
