import { expect, test, type Page } from '@playwright/test'

// Splash di awal sesi (index.html, src/splash.css, public/splash.js, src/app/splash.ts). Tes lain
// melewatinya karena navigator.webdriver; di sini nilainya ditimpa, jadi splash-nya benar-benar diputar.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false }))
})

const splash = (page: Page) => page.locator('#splash')
const nameInput = (page: Page) => page.getByPlaceholder('Ketik nama teman…')

test('splash diputar sekali di awal sesi, lalu aplikasi terlihat utuh', async ({ page }) => {
  await page.goto('/')
  await expect(splash(page)).toBeVisible()
  await expect(splash(page).getByText('Tookthel', { exact: true })).toBeVisible()
  await expect(splash(page)).toHaveCount(0, { timeout: 6000 })
  await expect(page.getByRole('heading', { level: 2, name: /Siapa aja/ })).toBeVisible()

  // Sesi yang sama: tanpa splash.
  await page.reload()
  await expect(splash(page)).toHaveCount(0)
  await expect(nameInput(page)).toBeVisible()
})

test('ketukan melewati splash tanpa ikut menekan isian di bawahnya', async ({ page }) => {
  await page.goto('/')
  await expect(splash(page)).toBeVisible()
  // Ketuk tepat di atas isian nama, yang tertutup splash.
  const box = (await nameInput(page).boundingBox())!
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await expect(splash(page)).toHaveCount(0, { timeout: 1000 })
  await expect(nameInput(page)).not.toBeFocused()
})

test('tombol apa pun melewati splash', async ({ page }) => {
  await page.goto('/')
  await expect(splash(page)).toBeVisible()
  await expect(nameInput(page)).toBeAttached()
  await page.keyboard.press('Escape')
  await expect(splash(page)).toHaveCount(0, { timeout: 1000 })
})

test('dengan gerakan dikurangi, splash dilewati dan aplikasi langsung terlihat', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(splash(page)).toHaveCount(0)
  await expect(nameInput(page)).toBeVisible()
})
