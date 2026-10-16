import { describe, expect, it } from 'vitest'
import { emptyBill, type Bill } from '../domain/bill'
import { emptyDonation } from '../domain/donation'
import { loadBill, loadDonation, saveBill, saveDonation } from './storage'

function memoryStorage(initial: string | null = null) {
  let value = initial
  return {
    getItem: () => value,
    setItem: (_key: string, v: string) => {
      value = v
    },
    get value() {
      return value
    },
  }
}
/** Storage yang membedakan key, untuk menguji migrasi dari key lama. */
function keyedStorage(entries: Record<string, string> = {}) {
  const data = new Map(Object.entries(entries))
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, v: string) => void data.set(key, v),
    data,
  }
}
const broken = {
  getItem: (): string | null => {
    throw new Error('akses ditolak')
  },
  setItem: () => {
    throw new Error('penyimpanan penuh')
  },
}

describe('loadBill', () => {
  it('mengembalikan tagihan kosong kalau belum ada data', () => {
    expect(loadBill(memoryStorage())).toEqual(emptyBill())
  })

  it('membaca tagihan yang tersimpan', () => {
    const saved: Bill = { ...emptyBill(), title: 'Makan malam', people: [{ id: 'a', name: 'Budi', color: '#FFB4A2' }], payerId: 'a' }
    expect(loadBill(memoryStorage(JSON.stringify(saved)))).toEqual(saved)
  })

  it('melengkapi field charges yang belum ada di data lama', () => {
    const old = { ...emptyBill(), title: 'Lama', charges: { servicePct: 0, taxPct: 11 } }
    expect(loadBill(memoryStorage(JSON.stringify(old))).charges).toEqual({ ...emptyBill().charges, servicePct: 0, taxPct: 11 })
  })

  it('mengisi info rekening kosong untuk data yang disimpan sebelum fitur itu ada', () => {
    const { paymentInfo: _, ...old } = { ...emptyBill(), title: 'Lama' }
    expect(loadBill(memoryStorage(JSON.stringify(old))).paymentInfo).toBe('')
  })

  it('masih membaca tagihan dari key lama sebelum ganti nama ke Tookthel', () => {
    const saved: Bill = { ...emptyBill(), title: 'Tagihan lama' }
    expect(loadBill(keyedStorage({ 'splitbill:v1': JSON.stringify(saved) }))).toEqual(saved)
  })

  it('mendahulukan key baru kalau dua-duanya ada', () => {
    const lama: Bill = { ...emptyBill(), title: 'Lama' }
    const baru: Bill = { ...emptyBill(), title: 'Baru' }
    const store = keyedStorage({ 'splitbill:v1': JSON.stringify(lama), 'tookthel:v1': JSON.stringify(baru) })
    expect(loadBill(store).title).toBe('Baru')
  })

  it('mengembalikan tagihan kosong kalau data rusak atau storage tidak bisa diakses', () => {
    expect(loadBill(memoryStorage('{bukan json'))).toEqual(emptyBill())
    expect(loadBill(memoryStorage('null'))).toEqual(emptyBill())
    expect(loadBill(memoryStorage('{"people":"bukan daftar","items":null}'))).toEqual(emptyBill())
    expect(loadBill(broken)).toEqual(emptyBill())
  })
})

describe('saveBill', () => {
  it('menyimpan tagihan sebagai JSON', () => {
    const store = memoryStorage()
    const bill = { ...emptyBill(), title: 'Ngopi' }
    saveBill(bill, store)
    expect(store.value).toBe(JSON.stringify(bill))
  })

  it('menyimpan ke key baru', () => {
    const store = keyedStorage()
    saveBill({ ...emptyBill(), title: 'Ngopi' }, store)
    expect([...store.data.keys()]).toEqual(['tookthel:v1'])
  })

  it('tidak melempar error kalau storage penuh', () => {
    expect(() => saveBill(emptyBill(), broken)).not.toThrow()
  })
})

describe('loadDonation / saveDonation', () => {
  it('menyimpan status ajakan donasi terpisah dari tagihan', () => {
    const store = keyedStorage()
    const state = { ...emptyDonation(), completedBills: 2, donated: true }
    saveDonation(state, store)
    expect([...store.data.keys()]).toEqual(['tookthel:donasi:v1'])
    expect(loadDonation(store)).toEqual(state)
  })

  it('mengembalikan status kosong kalau belum ada, rusak, atau storage tidak bisa diakses', () => {
    expect(loadDonation(keyedStorage())).toEqual(emptyDonation())
    expect(loadDonation(memoryStorage('{bukan json'))).toEqual(emptyDonation())
    expect(loadDonation(broken)).toEqual(emptyDonation())
    expect(() => saveDonation(emptyDonation(), broken)).not.toThrow()
  })
})
