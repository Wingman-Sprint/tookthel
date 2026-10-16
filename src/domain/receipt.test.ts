import { describe, expect, it } from 'vitest'
import { emptyBill, type Bill, type Charges } from './bill'
import { calculate } from './calculate'
import { buildReceipt } from './receipt'

const at = new Date(2026, 9, 2, 6, 7)
const bill = (patch: Partial<Bill> = {}, charges: Partial<Charges> = {}): Bill => ({
  ...emptyBill(),
  title: 'Makan malam',
  people: [
    { id: 'a', name: 'Budi', color: '#000' },
    { id: 'b', name: 'Ani', color: '#000' },
  ],
  items: [
    { id: 'x', name: 'Iga Bakar', price: 100000, qty: 1, sharedBy: ['a', 'b'] },
    { id: 'y', name: 'Es Teh', price: 5000, qty: 2, sharedBy: ['b'] },
  ],
  payerId: 'a',
  ...patch,
  charges: { ...emptyBill().charges, ...charges },
})
const receipt = (b: Bill) => buildReceipt(b, calculate(b), at)

describe('buildReceipt', () => {
  it('menyalin judul, waktu cetak, dan menu beserta jumlahnya', () => {
    const r = receipt(bill())
    expect(r.title).toBe('Makan malam')
    expect(r.printedAt).toBe('2 Okt 2026 · 06.07')
    expect(r.items).toEqual([
      { name: 'Iga Bakar', qty: 1, price: 100000, amount: 100000 },
      { name: 'Es Teh', qty: 2, price: 5000, amount: 10000 },
    ])
    expect(r.subtotal).toBe(110000)
  })

  it('memakai judul bawaan kalau tagihan belum diberi nama', () => {
    expect(receipt(bill({ title: '   ' })).title).toBe('Patungan')
  })

  it('hanya menulis biaya yang dipakai, dengan diskon sebagai pengurang', () => {
    const r = receipt(bill({}, { discount: 10000, extraFee: 4000 }))
    expect(r.charges.map((l) => l.label)).toEqual(['Diskon', 'Service 5%', 'Pajak 10%', 'Biaya lain'])
    expect(r.charges[0].amount).toBe(-10000)

    const plain = receipt(bill({}, { servicePct: 0, taxPct: 0 }))
    expect(plain.charges).toEqual([])
    expect(plain.total).toBe(110000)
  })

  it('menulis service dan pajak nominal tanpa persen', () => {
    const r = receipt(bill({}, { serviceType: 'amount', serviceAmount: 6000, taxType: 'amount', taxAmount: 11500 }))
    expect(r.charges).toEqual([
      { label: 'Service', amount: expect.closeTo(6000) },
      { label: 'Pajak', amount: expect.closeTo(11500) },
    ])
    expect(r.total).toBe(127500)
  })

  it('menulis persen diskon kalau diskonnya persen', () => {
    expect(receipt(bill({}, { discount: 10, discountType: 'pct' })).charges[0]).toEqual({ label: 'Diskon 10%', amount: -11000 })
  })

  it('menandai pembayar, menulis rekeningnya, dan totalnya sama dengan hasil hitungan', () => {
    const b = bill({ paymentInfo: ' BCA 123 a.n. Budi ' })
    const r = receipt(b)
    expect(r.people).toEqual([
      { name: 'Budi', amount: calculate(b).perPerson[0].total, isPayer: true },
      { name: 'Ani', amount: calculate(b).perPerson[1].total, isPayer: false },
    ])
    expect(r.payerName).toBe('Budi')
    expect(r.paymentInfo).toBe('BCA 123 a.n. Budi')
    expect(r.total).toBe(calculate(b).total)
  })

  it('tidak menulis rekening kalau belum ada pembayar', () => {
    const r = receipt(bill({ payerId: null, paymentInfo: 'BCA 123' }))
    expect(r.payerName).toBeNull()
    expect(r.paymentInfo).toBe('')
    expect(r.people.every((p) => !p.isPayer)).toBe(true)
  })

  it('menjelaskan pembulatan dan siapa yang menanggung selisihnya', () => {
    expect(receipt(bill({}, { roundTo: 500 })).roundingNote).toBe('Dibulatkan ke Rp 500, selisihnya ke Budi.')
    expect(receipt(bill({ payerId: null }, { roundTo: 1000 })).roundingNote).toBe('Dibulatkan ke Rp 1.000.')
    expect(receipt(bill()).roundingNote).toBeNull()
  })
})
