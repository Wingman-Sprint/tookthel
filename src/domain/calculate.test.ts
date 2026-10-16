import { describe, expect, it } from 'vitest'
import type { Bill, Charges, Item, Person } from './bill'
import { calculate, itemsSubtotal } from './calculate'

const person = (id: string): Person => ({ id, name: id, color: '#000' })
const item = (id: string, price: number, sharedBy: string[], qty = 1): Item => ({ id, name: id, price, qty, sharedBy })
const charges = (patch: Partial<Charges> = {}): Charges => ({
  serviceType: 'pct',
  servicePct: 0,
  serviceAmount: 0,
  taxType: 'pct',
  taxPct: 0,
  taxAmount: 0,
  taxAfterService: true,
  discount: 0,
  discountType: 'amount',
  extraFee: 0,
  roundTo: 1,
  ...patch,
})
const bill = (patch: Partial<Bill>): Bill => ({ title: '', people: [], items: [], charges: charges(), payerId: null, paymentInfo: '', ...patch })
const totals = (b: Bill) => calculate(b).perPerson.map((r) => r.total)

describe('itemsSubtotal', () => {
  it('menjumlahkan harga × jumlah semua menu, termasuk yang belum ada pemesannya', () => {
    expect(itemsSubtotal([item('a', 25000, ['x'], 2), item('b', 5000, [])])).toBe(55000)
    expect(itemsSubtotal([])).toBe(0)
  })
})

describe('calculate', () => {
  it('membagi menu bersama rata, lalu menambah service dan pajak setelah service', () => {
    const result = calculate(
      bill({
        people: [person('a'), person('b'), person('c')],
        items: [item('nasi', 25000, ['a', 'b'], 2), item('esteh', 5000, ['a', 'b', 'c'], 3), item('ayam', 40000, ['c'])],
        charges: charges({ servicePct: 5, taxPct: 10 }),
        payerId: 'a',
      }),
    )

    expect(result.subtotal).toBe(105000)
    expect(result.service).toBe(5250)
    expect(result.tax).toBe(11025)
    expect(result.total).toBe(121275)
    expect(result.perPerson.map((r) => r.total)).toEqual([34650, 34650, 51975])
    expect(result.perPerson[0].lines).toEqual([
      { itemId: 'nasi', name: 'nasi', amount: 25000, split: 2 },
      { itemId: 'esteh', name: 'esteh', amount: 5000, split: 3 },
    ])
  })

  it('menghitung pajak dari subtotal saja kalau taxAfterService mati', () => {
    const result = calculate(
      bill({
        people: [person('a')],
        items: [item('x', 100000, ['a'])],
        charges: charges({ servicePct: 5, taxPct: 10, taxAfterService: false }),
      }),
    )
    expect(result.service).toBe(5000)
    expect(result.tax).toBe(10000)
    expect(result.total).toBe(115000)
  })

  it('membagi diskon nominal sesuai porsi pesanan sebelum service', () => {
    const b = bill({
      people: [person('a'), person('b')],
      items: [item('x', 60000, ['a']), item('y', 40000, ['b'])],
      charges: charges({ discount: 10000, servicePct: 10 }),
    })
    const result = calculate(b)
    expect(result.discount).toBeCloseTo(10000)
    expect(result.perPerson.map((r) => r.discount)).toEqual([expect.closeTo(6000), expect.closeTo(4000)])
    expect(totals(b)).toEqual([59400, 39600])
  })

  it('mendukung diskon persen', () => {
    const b = bill({
      people: [person('a')],
      items: [item('x', 100000, ['a'])],
      charges: charges({ discount: 20, discountType: 'pct', taxPct: 10 }),
    })
    expect(totals(b)).toEqual([88000])
  })

  it('membagi service nominal sesuai porsi pesanan, lalu pajak persen dihitung setelahnya', () => {
    const b = bill({
      people: [person('a'), person('b')],
      items: [item('x', 60000, ['a']), item('y', 40000, ['b'])],
      // servicePct sisa dari mode persen diabaikan selama service-nya nominal.
      charges: charges({ serviceType: 'amount', serviceAmount: 10000, servicePct: 5, taxPct: 10 }),
    })
    const result = calculate(b)
    expect(result.perPerson.map((r) => r.service)).toEqual([6000, 4000])
    expect(result.service).toBe(10000)
    expect(result.tax).toBe(11000)
    expect(totals(b)).toEqual([72600, 48400])
  })

  it('membagi pajak nominal sesuai porsi pesanan, tanpa terpengaruh urutan service', () => {
    const b = bill({
      people: [person('a'), person('b')],
      items: [item('x', 60000, ['a']), item('y', 40000, ['b'])],
      charges: charges({ servicePct: 10, taxType: 'amount', taxAmount: 12000, taxPct: 11 }),
    })
    const after = calculate(b)
    expect(after.perPerson.map((r) => r.tax)).toEqual([7200, 4800])
    expect(after.total).toBe(122000)
    expect(totals(b)).toEqual([73200, 48800])

    const before = calculate({ ...b, charges: { ...b.charges, taxAfterService: false } })
    expect(before.perPerson.map((r) => r.total)).toEqual([73200, 48800])
  })

  it('service dan pajak nominal dibagi dari porsi sebelum diskon', () => {
    const b = bill({
      people: [person('a'), person('b')],
      items: [item('x', 75000, ['a']), item('y', 25000, ['b'])],
      charges: charges({ discount: 20000, serviceType: 'amount', serviceAmount: 8000, taxType: 'amount', taxAmount: 4000 }),
    })
    // a: 75.000 − 15.000 + 6.000 + 3.000, b: 25.000 − 5.000 + 2.000 + 1.000
    expect(totals(b)).toEqual([69000, 23000])
  })

  it('membatasi diskon supaya tidak melebihi subtotal', () => {
    const result = calculate(
      bill({ people: [person('a')], items: [item('x', 50000, ['a'])], charges: charges({ discount: 80000 }) }),
    )
    expect(result.discount).toBe(50000)
    expect(result.total).toBe(0)
  })

  it('membagi biaya lain rata ke semua orang, termasuk yang tidak memesan', () => {
    const b = bill({
      people: [person('a'), person('b'), person('c')],
      items: [item('x', 30000, ['a', 'b'])],
      charges: charges({ extraFee: 15000 }),
    })
    expect(totals(b)).toEqual([20000, 20000, 5000])
    expect(calculate(b).extra).toBe(15000)
  })

  it('membebankan selisih pembulatan ke pembayar', () => {
    const b = bill({ people: [person('a'), person('b'), person('c')], items: [item('x', 10000, ['a', 'b', 'c'])], payerId: 'b' })
    expect(totals(b)).toEqual([3333, 3334, 3333])
    expect(calculate(b).total).toBe(10000)
  })

  it('membebankan selisih pembulatan ke orang pertama kalau belum ada pembayar', () => {
    const b = bill({ people: [person('a'), person('b'), person('c')], items: [item('x', 10000, ['a', 'b', 'c'])] })
    expect(totals(b)).toEqual([3334, 3333, 3333])
  })

  it('membulatkan tagihan selain pembayar ke kelipatan terdekat, sisanya ke pembayar', () => {
    const b = bill({
      people: [person('a'), person('b'), person('c')],
      items: [item('x', 12000, ['a']), item('y', 23400, ['b']), item('z', 18600, ['c'])],
      charges: charges({ roundTo: 1000 }),
      payerId: 'a',
    })
    // b 23.400 turun ke 23.000, c 18.600 naik ke 19.000, a menanggung sisa dari total 54.000
    expect(totals(b)).toEqual([12000, 23000, 19000])
    expect(calculate(b).total).toBe(54000)
  })

  it('pembulatan tetap menjaga total sama dengan struk saat menu dibagi rata', () => {
    const b = bill({
      people: [person('a'), person('b'), person('c')],
      items: [item('x', 10000, ['a', 'b', 'c'])],
      charges: charges({ roundTo: 500 }),
      payerId: 'a',
    })
    expect(totals(b)).toEqual([3000, 3500, 3500])
    expect(totals(b).reduce((s, t) => s + t, 0)).toBe(calculate(b).total)
  })

  it('tidak menghitung pesanan tanpa pemilik dan mencatatnya di unassigned', () => {
    const result = calculate(
      bill({ people: [person('a')], items: [item('x', 10000, ['a']), item('y', 5000, []), item('z', 7000, ['hantu'])] }),
    )
    expect(result.subtotal).toBe(10000)
    expect(result.unassigned).toBe(2)
  })

  it('mengabaikan id di sharedBy yang orangnya sudah dihapus', () => {
    const result = calculate(bill({ people: [person('a'), person('b')], items: [item('x', 10000, ['a', 'hantu'])] }))
    expect(result.perPerson.map((r) => r.subtotal)).toEqual([10000, 0])
    expect(result.unassigned).toBe(0)
  })

  it('mengembalikan total 0 kalau belum ada orang', () => {
    const result = calculate(bill({ items: [item('x', 10000, [])], charges: charges({ extraFee: 10000 }) }))
    expect(result.total).toBe(0)
    expect(result.perPerson).toEqual([])
  })
})
