import { describe, expect, it } from 'vitest'
import { ASK_AFTER_BILLS, countBill, dismissDonation, emptyDonation, markDonated, restoreDonation, shouldAskDonation, shouldPeekDonation, SNOOZE_MS } from './donation'

const NOW = 1_800_000_000_000
const ready = { ...emptyDonation(), completedBills: ASK_AFTER_BILLS }

describe('countBill', () => {
  it('menambah hitungan untuk isi tagihan yang baru', () => {
    const s = countBill(countBill(emptyDonation(), 'a'), 'b')
    expect(s.completedBills).toBe(2)
  })

  it('tidak menambah hitungan kalau isi tagihannya sama', () => {
    const once = countBill(emptyDonation(), 'a')
    expect(countBill(once, 'a')).toBe(once)
  })
})

describe('shouldAskDonation', () => {
  it('belum bertanya sebelum tagihan ke-3', () => {
    expect(shouldAskDonation({ ...emptyDonation(), completedBills: ASK_AFTER_BILLS - 1 }, NOW, true)).toBe(false)
    expect(shouldAskDonation(ready, NOW, true)).toBe(true)
  })

  it('setelah ditutup, diam 30 hari lalu boleh bertanya lagi', () => {
    const s = dismissDonation(ready, NOW)
    expect(shouldAskDonation(s, NOW + SNOOZE_MS - 1, true)).toBe(false)
    expect(shouldAskDonation(s, NOW + SNOOZE_MS, true)).toBe(true)
  })

  it('tidak pernah bertanya lagi setelah link donasi dibuka', () => {
    expect(shouldAskDonation(markDonated(ready), NOW + SNOOZE_MS * 10, true)).toBe(false)
  })

  it('tidak bertanya saat offline', () => {
    expect(shouldAskDonation(ready, NOW, false)).toBe(false)
  })
})

describe('shouldPeekDonation', () => {
  it('muncul sejak tagihan pertama dan tidak terpengaruh "Nanti aja"', () => {
    expect(shouldPeekDonation(emptyDonation(), true)).toBe(true)
    expect(shouldPeekDonation(dismissDonation(emptyDonation(), NOW), true)).toBe(true)
  })

  it('diam untuk yang sudah donasi atau sedang offline', () => {
    expect(shouldPeekDonation(markDonated(emptyDonation()), true)).toBe(false)
    expect(shouldPeekDonation(emptyDonation(), false)).toBe(false)
  })
})

describe('restoreDonation', () => {
  it('status yang utuh kembali persis sama', () => {
    const s = { completedBills: 4, lastBillKey: 'abc', dismissedAt: NOW, donated: true }
    expect(restoreDonation(JSON.parse(JSON.stringify(s)))).toEqual(s)
  })

  it('nilai yang tipenya salah diganti nilai bawaan', () => {
    expect(restoreDonation(null)).toEqual(emptyDonation())
    expect(restoreDonation({ completedBills: -2, lastBillKey: 9, dismissedAt: 'kemarin', donated: 'ya' })).toEqual(emptyDonation())
  })
})
