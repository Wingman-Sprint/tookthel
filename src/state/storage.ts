import { emptyBill, restoreBill, type Bill } from '../domain/bill'
import { emptyDonation, restoreDonation, type DonationState } from '../domain/donation'

const KEY = 'tookthel:v1'
// Key sebelum ganti nama dari SplitBill; tetap dibaca supaya tagihan pengguna lama tidak hilang.
const LEGACY_KEY = 'splitbill:v1'
// Dipisah dari tagihan supaya reset tagihan tidak ikut menghapus status ajakan donasi.
const DONATION_KEY = 'tookthel:donasi:v1'

type Store = Pick<Storage, 'getItem' | 'setItem'>

export function loadBill(storage: Store = globalThis.localStorage): Bill {
  try {
    const raw = storage.getItem(KEY) ?? storage.getItem(LEGACY_KEY)
    if (raw) return restoreBill(JSON.parse(raw))
  } catch {
    /* storage tidak tersedia atau isinya rusak */
  }
  return emptyBill()
}

export function saveBill(bill: Bill, storage: Store = globalThis.localStorage) {
  try {
    storage.setItem(KEY, JSON.stringify(bill))
  } catch {
    /* abaikan */
  }
}

export function loadDonation(storage: Store = globalThis.localStorage): DonationState {
  try {
    const raw = storage.getItem(DONATION_KEY)
    if (raw) return restoreDonation(JSON.parse(raw))
  } catch {
    /* storage tidak tersedia atau isinya rusak */
  }
  return emptyDonation()
}

export function saveDonation(state: DonationState, storage: Store = globalThis.localStorage) {
  try {
    storage.setItem(DONATION_KEY, JSON.stringify(state))
  } catch {
    /* abaikan */
  }
}
