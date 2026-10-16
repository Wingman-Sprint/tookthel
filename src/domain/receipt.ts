import { receiptDate, rupiah } from '../lib/format'
import { payerOf, type Bill, type Charges } from './bill'
import type { BillResult } from './calculate'

type ChargeLine = { label: string; amount: number }

/** Isi struk patungan; digambar ke kanvas lalu dibagikan sebagai gambar. */
export type Receipt = {
  title: string
  printedAt: string
  items: { name: string; qty: number; price: number; amount: number }[]
  subtotal: number
  charges: ChargeLine[]
  total: number
  people: { name: string; amount: number; isPayer: boolean }[]
  payerName: string | null
  paymentInfo: string
  roundingNote: string | null
}

/** Diskon (negatif), service, pajak, dan biaya lain yang dipakai saja, urut seperti di struk. */
export function chargeLines(c: Charges, result: BillResult): ChargeLine[] {
  const lines: (ChargeLine | false)[] = [
    result.discount > 0 && { label: c.discountType === 'pct' ? `Diskon ${c.discount}%` : 'Diskon', amount: -result.discount },
    result.service > 0 && { label: c.serviceType === 'pct' ? `Service ${c.servicePct}%` : 'Service', amount: result.service },
    result.tax > 0 && { label: c.taxType === 'pct' ? `Pajak ${c.taxPct}%` : 'Pajak', amount: result.tax },
    result.extra > 0 && { label: 'Biaya lain', amount: result.extra },
  ]
  return lines.filter((l) => l !== false)
}

/** Keterangan pembulatan per orang, atau null kalau tidak dibulatkan. */
export const roundingNote = (c: Charges, payerName?: string) =>
  c.roundTo > 1 ? `Dibulatkan ke ${rupiah(c.roundTo)}${payerName ? `, selisihnya ke ${payerName}` : ''}.` : null

export function buildReceipt(bill: Bill, result: BillResult, printedAt: Date): Receipt {
  const payer = payerOf(bill)
  return {
    title: bill.title.trim() || 'Patungan',
    printedAt: receiptDate(printedAt),
    items: bill.items.map((i) => ({ name: i.name, qty: i.qty, price: i.price, amount: i.price * i.qty })),
    subtotal: result.subtotal,
    charges: chargeLines(bill.charges, result),
    total: result.total,
    people: result.perPerson.map((r) => ({
      name: bill.people.find((p) => p.id === r.personId)!.name,
      amount: r.total,
      isPayer: r.personId === payer?.id,
    })),
    payerName: payer?.name ?? null,
    paymentInfo: payer ? bill.paymentInfo.trim() : '',
    roundingNote: roundingNote(bill.charges, payer?.name),
  }
}
