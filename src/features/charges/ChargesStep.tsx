import { motion } from 'motion/react'
import type { Dispatch, ReactNode } from 'react'
import type { Bill, Charges } from '../../domain/bill'
import type { BillResult } from '../../domain/calculate'
import { billMood } from '../../domain/mood'
import { chargeLines } from '../../domain/receipt'
import type { Action } from '../../state/billReducer'
import { AnimatedRupiah, MoneyInput, PercentInput, SectionTitle, Segmented, TaxIllustration, Toggle } from '../../ui'

function Presets({ label, values, current, onPick }: { label: string; values: number[]; current: number; onPick: (v: number) => void }) {
  return (
    <div className="mt-2.5 grid grid-cols-3 gap-1">
      {values.map((v) => (
        <motion.button
          key={v}
          whileTap={{ scale: 0.9 }}
          onClick={() => onPick(v)}
          aria-label={`${label} ${v}%`}
          aria-pressed={current === v}
          className={`h-10 rounded-full text-xs font-bold transition-colors ${current === v ? 'bg-ink text-bg' : 'bg-surface-2 text-muted'}`}
        >
          {v}%
        </motion.button>
      ))}
    </div>
  )
}

function Card({ children }: { children: ReactNode }) {
  return <div className="rounded-[1.6rem] bg-surface p-5">{children}</div>
}

/** Kartu service atau pajak: persen dengan pilihan cepat, atau nominal Rp persis seperti di struk. */
function FeeCard({
  id,
  title,
  label,
  presets,
  type,
  pct,
  amount,
  onType,
  onPct,
  onAmount,
}: {
  id: string
  title: string
  label: string
  presets: number[]
  type: Charges['serviceType']
  pct: number
  amount: number
  onType: (type: Charges['serviceType']) => void
  onPct: (pct: number) => void
  onAmount: (amount: number) => void
}) {
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">{title}</p>
        <div className="w-32">
          <Segmented
            id={id}
            label={`Satuan ${label.toLowerCase()}`}
            value={type}
            onChange={onType}
            options={[
              { value: 'pct', label: '%' },
              { value: 'amount', label: 'Rp' },
            ]}
          />
        </div>
      </div>
      {type === 'pct' ? (
        <>
          <PercentInput label={`${label} (%)`} value={pct} onChange={onPct} />
          <Presets label={label} values={presets} current={pct} onPick={onPct} />
        </>
      ) : (
        <>
          <MoneyInput label={`${label} (Rp)`} value={amount} onChange={onAmount} />
          <p className="mt-2 text-xs text-muted">Isi nominal {label.toLowerCase()} di struk, dibagi sesuai porsi pesanan.</p>
        </>
      )}
    </Card>
  )
}

export function ChargesStep({ bill, result, dispatch }: { bill: Bill; result: BillResult; dispatch: Dispatch<Action> }) {
  const c = bill.charges
  const patch = (p: Partial<typeof c>) => dispatch({ type: 'charges', patch: p })

  // Ringkasan memakai baris yang sama dengan struk yang dibagikan.
  const rows = [{ label: 'Subtotal', amount: result.subtotal }, ...chargeLines(c, result)]

  return (
    <div>
      <SectionTitle
        eyebrow="Langkah 3"
        title={<>Pajak & <span className="font-serif font-normal italic">service</span></>}
        art={<TaxIllustration mood={billMood(result)} className="w-20 shrink-0" />}
      >
        Samain sama yang tertulis di struk ya.
      </SectionTitle>

      <div className="grid gap-3">
        <FeeCard
          id="service"
          title="Service"
          label="Service"
          presets={[0, 5, 10]}
          type={c.serviceType}
          pct={c.servicePct}
          amount={c.serviceAmount}
          onType={(serviceType) => patch({ serviceType })}
          onPct={(servicePct) => patch({ servicePct })}
          onAmount={(serviceAmount) => patch({ serviceAmount })}
        />
        <FeeCard
          id="tax"
          title="Pajak (PB1)"
          label="Pajak"
          presets={[0, 10, 11]}
          type={c.taxType}
          pct={c.taxPct}
          amount={c.taxAmount}
          onType={(taxType) => patch({ taxType })}
          onPct={(taxPct) => patch({ taxPct })}
          onAmount={(taxAmount) => patch({ taxAmount })}
        />

        {/* Pajak nominal sudah final dari struk, jadi urutannya terhadap service tidak berpengaruh. */}
        {c.taxType === 'pct' && (
          <Card>
            <Toggle
              checked={c.taxAfterService}
              onChange={(taxAfterService) => patch({ taxAfterService })}
              label={
                <>
                  <b className="font-semibold">Pajak dihitung setelah service</b>
                  <span className="block text-xs text-muted">Umumnya begini di restoran Indonesia</span>
                </>
              }
            />
          </Card>
        )}

        <Card>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">Diskon / promo</p>
            <div className="w-32">
              <Segmented
                id="disc"
                label="Satuan diskon"
                value={c.discountType}
                onChange={(discountType) => patch({ discountType, discount: 0 })}
                options={[
                  { value: 'amount', label: 'Rp' },
                  { value: 'pct', label: '%' },
                ]}
              />
            </div>
          </div>
          {c.discountType === 'amount' ? (
            <MoneyInput label="Diskon (Rp)" value={c.discount} onChange={(discount) => patch({ discount })} />
          ) : (
            <PercentInput label="Diskon (%)" value={c.discount} onChange={(discount) => patch({ discount })} />
          )}
          <p className="mt-2 text-xs text-muted">Dipotong dari subtotal sebelum service & pajak, dibagi sesuai porsi pesanan.</p>
        </Card>

        <Card>
          <p className="mb-2 text-sm font-semibold">Ongkir / biaya lain</p>
          <MoneyInput label="Ongkir atau biaya lain" value={c.extraFee} onChange={(extraFee) => patch({ extraFee })} />
          <p className="mt-2 text-xs text-muted">Dibagi rata ke semua orang.</p>
        </Card>

        <Card>
          <p className="mb-3 text-sm font-semibold">Pembulatan per orang</p>
          <Segmented
            id="round"
            label="Pembulatan per orang"
            value={String(c.roundTo)}
            onChange={(v) => patch({ roundTo: Number(v) })}
            options={[
              { value: '1', label: 'Tidak' },
              { value: '100', label: '100' },
              { value: '500', label: '500' },
              { value: '1000', label: '1rb' },
            ]}
          />
          <p className="mt-2 text-xs text-muted">Biar gampang transfer. Selisihnya ditanggung si tumbal yang bayar duluan.</p>
        </Card>
      </div>

      <motion.div layout className="mt-4 overflow-hidden rounded-[1.6rem] bg-hero p-5 text-cream">
        {rows.map((r) => (
          <motion.div layout key={r.label} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-between py-1 text-sm opacity-80">
            <span>{r.label}</span>
            <AnimatedRupiah value={r.amount} />
          </motion.div>
        ))}
        <motion.div layout className="mt-3 flex items-end justify-between border-t border-dashed border-white/20 pt-3">
          <span className="text-sm font-semibold">Total</span>
          <AnimatedRupiah value={result.total} className="text-2xl font-extrabold text-lime" />
        </motion.div>
      </motion.div>
    </div>
  )
}
