import { describe, expect, it } from 'vitest'
import indexHtml from '../../index.html?raw'
import logoSvg from '../../public/logo.svg?raw'
import { LOGO } from './Logo'

// Logo digambar di tiga tempat: konstanta LOGO (header dan kepala struk), public/logo.svg (favicon dan
// ikon PWA), dan splash di index.html, yang harus tergambar sebelum JavaScript dimuat. Test ini menjaga
// ketiganya tetap sama kalau logonya diubah.
describe('LOGO', () => {
  const face = [LOGO.receipt, LOGO.smile, LOGO.cut, ...LOGO.eyes.map(([cx, cy]) => `cx="${cx}" cy="${cy}"`)]

  it('public/logo.svg memakai bentuk yang sama', () => {
    for (const shape of face) expect(logoSvg).toContain(shape)
  })

  it('splash di index.html memakai bentuk yang sama, termasuk kotaknya', () => {
    for (const shape of [LOGO.tile, ...face]) expect(indexHtml).toContain(shape)
  })
})
