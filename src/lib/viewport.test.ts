import { describe, expect, it } from 'vitest'
import { keyboardInset } from './viewport'

// iPhone dengan layar 844 pt dan keyboard setinggi 336 pt.
const vv = { height: 508, offsetTop: 0, scale: 1 }

describe('keyboardInset', () => {
  it('kosong kalau keyboard tertutup', () => {
    expect(keyboardInset(844, { ...vv, height: 844 })).toBeNull()
  })

  it('bilah alamat yang mengecil tidak dianggap keyboard', () => {
    expect(keyboardInset(844, { ...vv, height: 790 })).toBeNull()
  })

  it('area di atas keyboard dihitung dari dasar layout viewport', () => {
    expect(keyboardInset(844, vv)).toEqual({ bottom: 336, height: 508 })
  })

  it('kalau Safari menggeser tampilan, dasar area yang terlihat ikut naik', () => {
    expect(keyboardInset(844, { ...vv, offsetTop: 200 })).toEqual({ bottom: 136, height: 508 })
    expect(keyboardInset(844, { ...vv, offsetTop: 336 })).toEqual({ bottom: 0, height: 508 })
  })

  it('zoom dengan dua jari bukan keyboard', () => {
    expect(keyboardInset(844, { height: 422, offsetTop: 100, scale: 2 })).toBeNull()
  })
})
