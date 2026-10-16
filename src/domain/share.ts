import { rupiah } from '../lib/format'
import { payerOf, type Bill, type Charges } from './bill'
import type { BillResult } from './calculate'
import { roundingNote } from './receipt'

/** "a", "a dan b", "a, b, dan c" */
const list = (parts: string[]) => (parts.length < 3 ? parts.join(' dan ') : `${parts.slice(0, -1).join(', ')}, dan ${parts.at(-1)}`)

/** "service 5%" atau "service Rp 5.000", false kalau tidak dipakai. */
const fee = (name: string, type: Charges['serviceType'], pct: number, amount: number) =>
  type === 'pct' ? pct > 0 && `${name} ${pct}%` : amount > 0 && `${name} ${rupiah(amount)}`

/** Penjelasan biaya tambahan yang dipakai saja, dalam kalimat biasa. */
function chargesNote(c: Charges, payerName: string | undefined) {
  const added = [
    fee('service', c.serviceType, c.servicePct, c.serviceAmount),
    fee('pajak', c.taxType, c.taxPct, c.taxAmount),
    c.extraFee > 0 && `biaya lain ${rupiah(c.extraFee)}`,
  ].filter((s) => s !== false)
  return [
    added.length > 0 && `Sudah termasuk ${list(added)}.`,
    c.discount > 0 && `Sudah dipotong diskon ${c.discountType === 'pct' ? `${c.discount}%` : rupiah(c.discount)}.`,
    roundingNote(c, payerName),
  ]
    .filter((s) => typeof s === 'string')
    .join(' ')
}

/** Rincian tagihan sebagai pesan grup chat; ikut terkirim bersama gambar struk. */
export function buildShareText(bill: Bill, result: BillResult) {
  const payer = payerOf(bill)
  const name = (id: string) => bill.people.find((p) => p.id === id)!.name
  const own = result.perPerson.find((r) => r.personId === payer?.id)
  const others = result.perPerson.filter((r) => r !== own)
  const account = payer ? bill.paymentInfo.trim() : ''
  const note = chargesNote(bill.charges, payer?.name)

  return [
    `${bill.title.trim() || 'Patungan'}: total ${rupiah(result.total)}${payer ? `, ${payer.name} jadi tumbal yang bayarin dulu` : ''}.`,
    '',
    ...(payer ? [`Transfer ke ${payer.name} ya:`, ...(account ? [account, ''] : [])] : ['Bagian masing-masing:']),
    ...others.map((r) => `- ${name(r.personId)}: ${rupiah(r.total)}`),
    ...(own ? [`(Bagian ${payer!.name} sendiri ${rupiah(own.total)})`] : []),
    '',
    ...(note ? [note] : []),
    'Dihitung pakai Tookthel',
  ].join('\n')
}
