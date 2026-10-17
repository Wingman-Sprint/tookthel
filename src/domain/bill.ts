export type Person = { id: string; name: string; color: string }

export type Item = {
  id: string
  name: string
  price: number // harga satuan
  qty: number
  sharedBy: string[] // id orang yang ikut menanggung item ini
}

export type Charges = {
  serviceType: 'amount' | 'pct'
  servicePct: number
  serviceAmount: number // nominal service di struk, dipakai kalau serviceType 'amount'
  taxType: 'amount' | 'pct'
  taxPct: number
  taxAmount: number // nominal pajak di struk, dipakai kalau taxType 'amount'
  taxAfterService: boolean // pajak persen dihitung dari subtotal + service
  discount: number
  discountType: 'amount' | 'pct'
  extraFee: number // ongkir / biaya lain, dibagi rata
  roundTo: number // kelipatan pembulatan tagihan per orang: 1 (tanpa pembulatan), 100, 500, 1000
}

export type Bill = {
  title: string
  people: Person[]
  items: Item[]
  charges: Charges
  payerId: string | null
  paymentInfo: string // rekening / e-wallet si pembayar, ikut di teks bagikan
}

/** Si tumbal yang bayar duluan di kasir, kalau sudah dipilih. */
export const payerOf = (bill: Bill) => bill.people.find((p) => p.id === bill.payerId)

export const emptyBill = (): Bill => ({
  title: '',
  people: [],
  items: [],
  charges: {
    serviceType: 'pct',
    servicePct: 5,
    serviceAmount: 0,
    taxType: 'pct',
    taxPct: 10,
    taxAmount: 0,
    taxAfterService: true,
    discount: 0,
    discountType: 'amount',
    extraFee: 0,
    roundTo: 1,
  },
  payerId: null,
  paymentInfo: '',
})

type Raw = Record<string, unknown>

const isRecord = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v)
const text = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback)
const amount = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : fallback)
const unit = (v: unknown, fallback: 'amount' | 'pct') => (v === 'amount' || v === 'pct' ? v : fallback)

function restorePerson(v: unknown): Person | null {
  if (!isRecord(v) || typeof v.id !== 'string' || typeof v.name !== 'string') return null
  return { id: v.id, name: v.name, color: text(v.color, '#C3B1E1') }
}

function restoreItem(v: unknown, ids: Set<string>): Item | null {
  if (!isRecord(v) || typeof v.id !== 'string' || typeof v.name !== 'string') return null
  const qty = amount(v.qty, 1)
  return {
    id: v.id,
    name: v.name,
    price: amount(v.price, 0),
    qty: Number.isInteger(qty) && qty >= 1 ? qty : 1,
    sharedBy: Array.isArray(v.sharedBy) ? v.sharedBy.filter((id): id is string => typeof id === 'string' && ids.has(id)) : [],
  }
}

function restoreCharges(v: unknown): Charges {
  const empty = emptyBill().charges
  const c = isRecord(v) ? v : {}
  return {
    serviceType: unit(c.serviceType, empty.serviceType),
    servicePct: amount(c.servicePct, empty.servicePct),
    serviceAmount: amount(c.serviceAmount, empty.serviceAmount),
    taxType: unit(c.taxType, empty.taxType),
    taxPct: amount(c.taxPct, empty.taxPct),
    taxAmount: amount(c.taxAmount, empty.taxAmount),
    taxAfterService: typeof c.taxAfterService === 'boolean' ? c.taxAfterService : empty.taxAfterService,
    discount: amount(c.discount, empty.discount),
    discountType: unit(c.discountType, empty.discountType),
    extraFee: amount(c.extraFee, empty.extraFee),
    roundTo: [1, 100, 500, 1000].includes(c.roundTo as number) ? (c.roundTo as number) : empty.roundTo,
  }
}

/**
 * Tagihan dari localStorage bisa berasal dari versi lama, rusak sebagian, atau diubah lewat devtools.
 * Hanya field yang dikenal dengan tipe yang benar yang dipakai; sisanya diisi nilai bawaan. Dengan
 * begitu satu nilai aneh tidak membuat aplikasi blank setiap kali dibuka.
 */
export function restoreBill(saved: unknown): Bill {
  if (!isRecord(saved)) return emptyBill()
  const people = (Array.isArray(saved.people) ? saved.people : []).map(restorePerson).filter((p) => p !== null)
  const ids = new Set(people.map((p) => p.id))
  const items = (Array.isArray(saved.items) ? saved.items : []).map((i) => restoreItem(i, ids)).filter((i) => i !== null)
  return {
    title: text(saved.title),
    people,
    items,
    charges: restoreCharges(saved.charges),
    payerId: typeof saved.payerId === 'string' && ids.has(saved.payerId) ? saved.payerId : (people[0]?.id ?? null),
    paymentInfo: text(saved.paymentInfo),
  }
}

/**
 * Isian form pesanan berbeda dari yang tersimpan, jadi akan hilang kalau sheet ditutup begitu saja.
 * Untuk pesanan baru (`saved` kosong), cukup ada satu isian yang sudah diubah dari form kosong.
 */
export function hasUnsavedChanges(saved: Item | undefined, current: Item): boolean {
  if (!saved) return current.name.trim() !== '' || current.price > 0 || current.qty > 1 || current.sharedBy.length > 0
  return (
    saved.name !== current.name.trim() ||
    saved.price !== current.price ||
    saved.qty !== current.qty ||
    saved.sharedBy.length !== current.sharedBy.length ||
    saved.sharedBy.some((id) => !current.sharedBy.includes(id))
  )
}
