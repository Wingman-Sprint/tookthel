import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, ChevronDown, Wallet } from 'lucide-react'
import { useState, type Dispatch } from 'react'
import { payerOf, type Bill } from '../../domain/bill'
import { DONATION_URL } from '../../domain/donation'
import type { BillResult } from '../../domain/calculate'
import { rupiah } from '../../lib/format'
import type { Action } from '../../state/billReducer'
import { AnimatedRupiah, Avatar, DoneIllustration } from '../../ui'

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}
const rise = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 300, damping: 26 } },
}

export function ResultStep({
  bill,
  result,
  dispatch,
  onDonate,
}: {
  bill: Bill
  result: BillResult
  dispatch: Dispatch<Action>
  onDonate: () => void
}) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const payer = payerOf(bill)
  const owed = result.perPerson.filter((r) => r.personId !== bill.payerId).reduce((s, r) => s + r.total, 0)

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      <motion.div variants={rise} className="mb-4 flex items-center gap-3">
        <DoneIllustration className="w-20 shrink-0" />
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-muted uppercase">Langkah 4</p>
          <h2 className="text-[2rem] leading-[1.05] font-extrabold tracking-tight">
            Beres, <span className="font-serif font-normal italic min-[360px]:whitespace-nowrap">tinggal transfer!</span>
          </h2>
        </div>
      </motion.div>

      {/* Bento ringkasan */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div variants={rise} className="relative col-span-2 overflow-hidden rounded-[1.8rem] bg-hero p-6 text-cream">
          <motion.div
            aria-hidden
            className="absolute -top-16 -right-10 size-48 rounded-full bg-lime/25 blur-2xl"
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 5, repeat: Infinity }}
          />
          <p className="relative text-sm opacity-70">Total tagihan</p>
          <AnimatedRupiah value={result.total} className="relative mt-1 block text-4xl font-extrabold tracking-tight text-lime" />
          <p className="relative mt-3 text-sm opacity-70">
            {bill.people.length} orang · {bill.items.length} menu
          </p>
        </motion.div>

        <motion.div variants={rise} className="rounded-[1.6rem] bg-lavender p-4 text-charcoal min-[360px]:p-5">
          <p className="text-xs font-semibold opacity-70">Pajak + service</p>
          <AnimatedRupiah value={result.tax + result.service} className="mt-1 block text-[clamp(15px,4.6vw,18px)] font-extrabold whitespace-nowrap" />
        </motion.div>
        <motion.div variants={rise} className="rounded-[1.6rem] bg-mint p-4 text-charcoal min-[360px]:p-5">
          <p className="text-xs font-semibold opacity-70">Ditagih ke teman</p>
          <AnimatedRupiah value={owed} className="mt-1 block text-[clamp(15px,4.6vw,18px)] font-extrabold whitespace-nowrap" />
        </motion.div>

        <motion.div variants={rise} className="col-span-2 rounded-[1.6rem] bg-surface p-5">
          <p className="text-sm font-semibold">Siapa tumbalnya?</p>
          <p className="text-xs text-muted">Yang bayarin dulu di kasir.</p>
          <div className="no-scrollbar -mx-5 mt-2 flex gap-3 overflow-x-auto px-5 pt-1.5 pb-1">
            {bill.people.map((p) => (
              <motion.button
                key={p.id}
                whileTap={{ scale: 0.9 }}
                onClick={() => dispatch({ type: 'payer', id: p.id })}
                aria-pressed={p.id === bill.payerId}
                className="flex w-[72px] shrink-0 flex-col items-center gap-1.5"
              >
                <Avatar name={p.name} color={p.color} size={48} selected={p.id === bill.payerId} />
                <span className={`line-clamp-2 w-full text-center text-xs leading-tight font-semibold wrap-break-word ${p.id === bill.payerId ? 'text-ink' : 'text-muted'}`}>
                  {p.name}
                </span>
              </motion.button>
            ))}
          </div>
          {payer && (
            <>
              <label className="mt-3 flex items-center gap-2.5 rounded-2xl bg-surface-2 px-4 py-3 ring-ink/80 transition focus-within:ring-2">
                <Wallet size={17} className="shrink-0 text-muted" aria-hidden />
                <input
                  value={bill.paymentInfo}
                  onChange={(e) => dispatch({ type: 'paymentInfo', paymentInfo: e.target.value })}
                  placeholder={`Rekening / e-wallet ${payer.name}`}
                  aria-label="Rekening atau e-wallet pembayar"
                  maxLength={80}
                  autoComplete="off"
                  className="w-full min-w-0 bg-transparent text-sm font-semibold outline-none placeholder:font-medium placeholder:text-muted"
                />
              </label>
              <p className="mt-1.5 text-xs text-muted">Ikut di teks yang dibagikan, mis. BCA 1234567890 a.n. {payer.name}.</p>
            </>
          )}
        </motion.div>
      </div>

      {/* Per orang */}
      <motion.p variants={rise} className="mt-7 mb-3 text-xs font-bold tracking-[0.18em] text-muted uppercase">
        Rincian per orang
      </motion.p>
      <div className="space-y-2.5">
        {result.perPerson.map((r) => {
          const p = bill.people.find((x) => x.id === r.personId)!
          const isPayer = r.personId === bill.payerId
          const open = expanded === r.personId
          return (
            <motion.div key={r.personId} variants={rise} layout className="overflow-hidden rounded-[1.4rem] bg-surface">
              <button
                onClick={() => setExpanded(open ? null : r.personId)}
                aria-expanded={open}
                className="flex w-full items-center gap-3 p-4 text-left"
              >
                <Avatar name={p.name} color={p.color} size={42} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{p.name}</p>
                  <p className="truncate text-xs text-muted">
                    {isPayer ? (
                      <span className="font-semibold text-violet">
                        {/* Di layar sempit cukup "Tumbal" supaya tidak terpotong. */}
                        Tumbal<span className="max-[359px]:sr-only"> hari ini</span>
                      </span>
                    ) : payer ? (
                      <>
                        {/* Di layar sempit cukup panah + nama supaya nama tujuan tetap terbaca. */}
                        <span className="max-[359px]:sr-only">Transfer ke </span>
                        <ArrowRight size={11} className="inline align-[-1px]" aria-hidden /> <b className="text-ink">{payer.name}</b>
                      </>
                    ) : (
                      `${r.lines.length} menu`
                    )}
                  </p>
                </div>
                <AnimatedRupiah value={r.total} className="shrink-0 font-extrabold" />
                <motion.span animate={{ rotate: open ? 180 : 0 }} className="shrink-0 text-muted">
                  <ChevronDown size={18} />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 36 }}
                  >
                    <div className="mx-4 mb-4 space-y-1.5 border-t border-dashed border-line pt-3 text-sm">
                      {r.lines.length === 0 && <p className="text-muted">Tidak memesan apa pun</p>}
                      {r.lines.map((l) => (
                        <Row key={l.itemId} label={l.split > 1 ? `${l.name} (÷${l.split})` : l.name} value={l.amount} />
                      ))}
                      {r.discount > 0 && <Row label="Diskon" value={-r.discount} />}
                      {r.service > 0 && <Row label="Service" value={r.service} muted />}
                      {r.tax > 0 && <Row label="Pajak" value={r.tax} muted />}
                      {r.extra > 0 && <Row label="Biaya lain" value={r.extra} muted />}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>

      {/* Jalur donasi tetap yang tidak mengganggu; ajakan lewat sheet hanya sesekali. */}
      <motion.p variants={rise} className="mt-8 text-center text-xs text-muted">
        Tookthel gratis tanpa iklan.{' '}
        <a
          href={DONATION_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onDonate}
          className="font-semibold text-ink underline decoration-line underline-offset-4"
        >
          Traktir kopi ☕
        </a>
      </motion.p>
    </motion.div>
  )
}

function Row({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${muted ? 'text-muted' : ''}`}>
      <span className="truncate">{label}</span>
      <span className="shrink-0 tabular-nums">{rupiah(value)}</span>
    </div>
  )
}
