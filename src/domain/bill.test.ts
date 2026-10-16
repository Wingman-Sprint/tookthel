import { describe, expect, it } from 'vitest'
import { emptyBill, payerOf, restoreBill, type Bill } from './bill'

describe('payerOf', () => {
  const people = [
    { id: 'a', name: 'Budi', color: '#000' },
    { id: 'b', name: 'Ani', color: '#000' },
  ]

  it('mengembalikan orang yang bayar duluan', () => {
    expect(payerOf({ ...emptyBill(), people, payerId: 'b' })?.name).toBe('Ani')
  })

  it('kosong kalau belum dipilih atau orangnya sudah dihapus', () => {
    expect(payerOf({ ...emptyBill(), people, payerId: null })).toBeUndefined()
    expect(payerOf({ ...emptyBill(), people, payerId: 'x' })).toBeUndefined()
  })
})

describe('restoreBill', () => {
  const bill: Bill = {
    title: 'Makan malam',
    people: [
      { id: 'a', name: 'Budi', color: '#FFB4A2' },
      { id: 'b', name: 'Ani', color: '#B8E0D2' },
    ],
    items: [{ id: 'x', name: 'Iga Bakar', price: 98000, qty: 2, sharedBy: ['a', 'b'] }],
    charges: {
      serviceType: 'amount',
      servicePct: 5,
      serviceAmount: 12000,
      taxType: 'pct',
      taxPct: 11,
      taxAmount: 0,
      taxAfterService: false,
      discount: 10,
      discountType: 'pct',
      extraFee: 8000,
      roundTo: 500,
    },
    payerId: 'b',
    paymentInfo: 'BCA 123',
  }

  it('tagihan yang utuh kembali persis sama', () => {
    expect(restoreBill(JSON.parse(JSON.stringify(bill)))).toEqual(bill)
  })

  it('bukan objek jadi tagihan kosong', () => {
    for (const saved of [null, 'teks', 42, [], undefined]) expect(restoreBill(saved)).toEqual(emptyBill())
  })

  it('melengkapi field yang belum ada di data versi lama', () => {
    const old = { title: 'Lama', people: bill.people, items: [{ id: 'x', name: 'Kopi', price: 20000 }], charges: { servicePct: 0 }, payerId: 'a' }
    const restored = restoreBill(old)
    // Tagihan dari sebelum ada service/pajak nominal tetap memakai persen.
    expect(restored.charges).toEqual({ ...emptyBill().charges, servicePct: 0 })
    expect(restored.charges).toMatchObject({ serviceType: 'pct', serviceAmount: 0, taxType: 'pct', taxAmount: 0 })
    expect(restored.items[0]).toEqual({ id: 'x', name: 'Kopi', price: 20000, qty: 1, sharedBy: [] })
    expect(restored.paymentInfo).toBe('')
  })

  it('membuang orang dan pesanan yang bentuknya rusak', () => {
    const restored = restoreBill({
      ...bill,
      people: [...bill.people, null, { id: 1, name: 'Angka' }, { id: 'c', name: 'Tanpa warna' }],
      items: [...bill.items, 'bukan pesanan', { id: 'y', price: 1000 }],
    })
    expect(restored.people.map((p) => p.name)).toEqual(['Budi', 'Ani', 'Tanpa warna'])
    expect(restored.people[2].color).toMatch(/^#/)
    expect(restored.items.map((i) => i.id)).toEqual(['x'])
  })

  it('angka yang tidak masuk akal diganti nilai bawaan', () => {
    const restored = restoreBill({
      ...bill,
      items: [{ id: 'x', name: 'Iga', price: -5000, qty: 1.5, sharedBy: ['a'] }],
      charges: {
        serviceType: 'rupiah',
        servicePct: 'lima',
        serviceAmount: -2000,
        taxType: 1,
        taxPct: -1,
        taxAmount: NaN,
        taxAfterService: 'ya',
        discount: null,
        discountType: 'gratis',
        extraFee: Infinity,
        roundTo: 250,
      },
    })
    expect(restored.items[0]).toMatchObject({ price: 0, qty: 1 })
    expect(restored.charges).toEqual(emptyBill().charges)
  })

  it('pemesan dan tumbal hanya boleh orang yang ada di tagihan', () => {
    const restored = restoreBill({ ...bill, items: [{ ...bill.items[0], sharedBy: ['a', 'hilang', 7] }], payerId: 'hilang' })
    expect(restored.items[0].sharedBy).toEqual(['a'])
    expect(restored.payerId).toBe('a')
    expect(restoreBill({ ...bill, people: [], payerId: 'a' }).payerId).toBeNull()
  })
})
