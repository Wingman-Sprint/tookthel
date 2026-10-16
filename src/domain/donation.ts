export const DONATION_URL = 'https://sociabuzz.com/byhund/tribe'

/** Ajakan baru muncul setelah pengguna merasakan manfaatnya beberapa kali. */
export const ASK_AFTER_BILLS = 3
/** Ajakan bertimer: muncul sekian lama setelah Hasil tampil, lalu tertutup sendiri. */
export const PEEK_DELAY_MS = 5000
export const PEEK_SECONDS = 10
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

/** Status dari localStorage; nilai yang tipenya salah diganti nilai bawaan. */
export function restoreDonation(saved: unknown): DonationState {
  const s = typeof saved === 'object' && saved !== null ? (saved as Partial<Record<keyof DonationState, unknown>>) : {}
  const count = s.completedBills
  return {
    completedBills: typeof count === 'number' && Number.isInteger(count) && count >= 0 ? count : 0,
    lastBillKey: typeof s.lastBillKey === 'string' ? s.lastBillKey : '',
    dismissedAt: typeof s.dismissedAt === 'number' && Number.isFinite(s.dismissedAt) ? s.dismissedAt : null,
    donated: s.donated === true,
  }
}

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

/** Ajakan bertimer tidak memakai jeda 30 hari, tapi tetap diam untuk yang sudah donasi atau sedang offline. */
export const shouldPeekDonation = (s: DonationState, online: boolean): boolean => !s.donated && online
