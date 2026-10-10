export const DONATION_URL = 'https://sociabuzz.com/byhund/tribe'

/** Ajakan baru muncul setelah pengguna merasakan manfaatnya beberapa kali. */
export const ASK_AFTER_BILLS = 3
/** Jeda setelah ajakan ditutup dengan "Nanti aja". */
export const SNOOZE_MS = 30 * 24 * 60 * 60 * 1000

export type DonationState = {
  /** Jumlah tagihan berbeda yang sudah sampai langkah Hasil. */
  completedBills: number
  /** Isi tagihan terakhir yang dihitung, supaya bolak-balik ke Hasil tidak menambah hitungan. */
  lastBillKey: string
  dismissedAt: number | null
  donated: boolean
}

export const emptyDonation = (): DonationState => ({ completedBills: 0, lastBillKey: '', dismissedAt: null, donated: false })

export function countBill(s: DonationState, billKey: string): DonationState {
  if (billKey === s.lastBillKey) return s
  return { ...s, completedBills: s.completedBills + 1, lastBillKey: billKey }
}

export const dismissDonation = (s: DonationState, now: number): DonationState => ({ ...s, dismissedAt: now })

export const markDonated = (s: DonationState): DonationState => ({ ...s, donated: true })

/** Yang sudah donasi tidak ditanya lagi; saat offline link-nya tidak bisa dibuka. */
export function shouldAskDonation(s: DonationState, now: number, online: boolean): boolean {
  if (s.donated || !online) return false
  if (s.completedBills < ASK_AFTER_BILLS) return false
  return s.dismissedAt === null || now - s.dismissedAt >= SNOOZE_MS
}
