import { motion } from 'motion/react'
import { Coffee, ExternalLink } from 'lucide-react'
import { DONATION_URL } from '../../domain/donation'
import { Button } from '../../ui'
import { Sheet } from '../../ui/Sheet'

/** Ajakan donasi yang selalu bisa ditutup; ditutup dengan cara apa pun dianggap "nanti aja". */
export default function DonationSheet({ open, onDismiss, onDonate }: { open: boolean; onDismiss: () => void; onDonate: () => void }) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onDismiss()} title="Traktir kopi?">
      <div className="relative overflow-hidden rounded-[1.6rem] bg-butter p-5 text-charcoal">
        <motion.span
          aria-hidden
          className="absolute -top-3 -right-3 grid size-20 place-items-center rounded-full bg-lime"
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 14 }}
        >
          <Coffee size={30} strokeWidth={2.2} className="-translate-x-1 translate-y-1" />
        </motion.span>
        <p className="pr-16 text-xl leading-tight font-extrabold tracking-tight">
          Tookthel gratis, <span className="font-serif font-normal italic">tanpa iklan.</span>
        </p>
        <p className="mt-2 pr-10 text-sm opacity-80">Kalau patungan tadi kebantu, boleh traktir kopi buat yang bikin. Seikhlasnya aja.</p>
      </div>
      <div className="mt-4 flex flex-col gap-2 pb-4">
        <motion.a
          href={DONATION_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onDonate}
          whileTap={{ scale: 0.95 }}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-ink px-5 py-3.5 font-semibold text-bg"
        >
          Dukung di Sociabuzz <ExternalLink size={17} aria-hidden />
        </motion.a>
        <Button variant="ghost" onClick={onDismiss}>
          Nanti aja
        </Button>
      </div>
    </Sheet>
  )
}
