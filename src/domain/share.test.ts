import { describe, expect, it } from 'vitest'
import { emptyBill, type Bill } from './bill'
import { calculate } from './calculate'
import { buildShareText } from './share'

const bill = (patch: Partial<Bill> = {}): Bill => ({
  ...emptyBill(),
  title: 'Makan malam',
  people: [
    { id: 'a', name: 'Budi', color: '#000' },
    { id: 'b', name: 'Ani', color: '#000' },
  ],
  items: [{ id: 'x', name: 'Bakso', price: 20000, qty: 1, sharedBy: ['a', 'b'] }],
  payerId: 'a',
  ...patch,
})
const share = (b: Bill) => buildShareText(b, calculate(b))

describe('buildShareText', () => {
  it('menulis total, siapa yang ditransfer, dan bagian tiap orang seperti pesan biasa', () => {
    expect(share(bill())).toBe(
      [
        'Makan malam: total Rp 23.100, Budi jadi tumbal yang bayarin dulu.',
        '',
        'Transfer ke Budi ya:',
        '- Ani: Rp 11.550',
        '(Bagian Budi sendiri Rp 11.550)',
        '',
        'Sudah termasuk service 5% dan pajak 10%.',
        'Dihitung pakai Tookthel',
      ].join('\n'),
    )
  })

  it('tidak memakai emoji hiasan', () => {
    expect(share(bill())).not.toMatch(/\p{Extended_Pictographic}/u)
  })

  it('memakai judul bawaan dan menulis bagian semua orang kalau belum ada pembayar', () => {
    const lines = share(bill({ title: '', payerId: null })).split('\n')
    expect(lines.slice(0, 5)).toEqual(['Patungan: total Rp 23.100.', '', 'Bagian masing-masing:', '- Budi: Rp 11.550', '- Ani: Rp 11.550'])
  })

  it('menulis rekening atau e-wallet tepat di bawah ajakan transfer', () => {
    const lines = share(bill({ paymentInfo: '  BCA 1234567890 a.n. Budi ' })).split('\n')
    expect(lines.slice(2, 6)).toEqual(['Transfer ke Budi ya:', 'BCA 1234567890 a.n. Budi', '', '- Ani: Rp 11.550'])
  })

  it('tidak menulis rekening kalau isinya kosong atau belum ada pembayar', () => {
    expect(share(bill({ paymentInfo: '   ' })).split('\n')[3]).toBe('- Ani: Rp 11.550')
    expect(share(bill({ paymentInfo: 'BCA 123', payerId: null }))).not.toContain('BCA 123')
  })

  it('menjelaskan diskon, biaya lain, dan pembulatan yang dipakai', () => {
    const c = emptyBill().charges
    expect(share(bill({ charges: { ...c, discount: 10, discountType: 'pct', extraFee: 12000 } }))).toContain(
      'Sudah termasuk service 5%, pajak 10%, dan biaya lain Rp 12.000. Sudah dipotong diskon 10%.',
    )
    expect(share(bill({ charges: { ...c, discount: 5000 } }))).toContain('Sudah dipotong diskon Rp 5.000.')
    expect(share(bill({ charges: { ...c, roundTo: 500 } }))).toContain('Dibulatkan ke Rp 500, selisihnya ke Budi.')
    expect(share(bill())).not.toContain('Dibulatkan')
  })

  it('menulis service dan pajak nominal dalam rupiah', () => {
    const c = emptyBill().charges
    expect(share(bill({ charges: { ...c, serviceType: 'amount', serviceAmount: 2000 } }))).toContain(
      'Sudah termasuk service Rp 2.000 dan pajak 10%.',
    )
    expect(share(bill({ charges: { ...c, taxType: 'amount', taxAmount: 2500 } }))).toContain('Sudah termasuk service 5% dan pajak Rp 2.500.')
    expect(share(bill({ charges: { ...c, serviceType: 'amount', taxType: 'amount' } }))).not.toContain('Sudah')
  })

  it('tidak menulis kalimat biaya kalau tanpa service, pajak, diskon, dan biaya lain', () => {
    const text = share(bill({ charges: { ...emptyBill().charges, servicePct: 0, taxPct: 0 } }))
    expect(text).not.toContain('Sudah')
    expect(text.endsWith('(Bagian Budi sendiri Rp 10.000)\n\nDihitung pakai Tookthel')).toBe(true)
  })
})
