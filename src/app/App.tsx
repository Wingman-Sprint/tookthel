import { AnimatePresence, motion, MotionConfig, type Variants } from 'motion/react'
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { calculate, itemsSubtotal } from '../domain/calculate'
import { PEEK_DELAY_MS, PEEK_SECONDS } from '../domain/donation'
import { LAST_STEP, stepBlocker } from '../domain/steps'
import { ChargesStep } from '../features/charges/ChargesStep'
import { ItemsStep } from '../features/items/ItemsStep'
import { PeopleStep } from '../features/people/PeopleStep'
import { celebrate } from '../features/result/celebrate'
import { ResultStep } from '../features/result/ResultStep'
import { useBill } from '../state/useBill'
import { useDonation } from '../state/useDonation'
import { AppToaster } from '../ui'
import { AppHeader } from './AppHeader'
import { BottomBar } from './BottomBar'
import { StepNav } from './StepNav'
import { useStepper } from './useStepper'

// Halaman cetak struk (beserta kanvas dan sheet-nya) baru dimuat saat pertama kali membagikan.
const PrintSheet = lazy(() => import('../features/result/PrintSheet'))
// Ajakan donasi jarang muncul, jadi sheet-nya juga baru dimuat saat dibutuhkan.
const DonationSheet = lazy(() => import('../features/result/DonationSheet'))

// Langkah lama dan baru beranimasi bersamaan (popLayout), jadi konten baru langsung muncul.
const stepVariants: Variants = {
  enter: (d: number) => ({ x: d * 24, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (d: number) => ({ x: d * -24, opacity: 0 }),
}

export default function App() {
  const [bill, dispatch] = useBill()
  const { step, dir, go } = useStepper(bill.items.length ? 1 : 0)
  const result = useMemo(() => calculate(bill), [bill])
  const [printOpen, setPrintOpen] = useState(false)
  // Tetap terpasang setelah dibuka sekali supaya animasi tutup sheet sempat jalan.
  const [printMounted, setPrintMounted] = useState(false)
  const donation = useDonation()
  const [askDonation, setAskDonation] = useState(false)
  // Ajakan bertimer tertutup sendiri dan tidak memicu jeda 30 hari milik ajakan setelah bagikan.
  const [donationTimed, setDonationTimed] = useState(false)
  const [donationMounted, setDonationMounted] = useState(false)
  const openDonation = (timed: boolean) => {
    setDonationMounted(true)
    setDonationTimed(timed)
    setAskDonation(true)
  }
  const billKey = JSON.stringify([bill.people, bill.items, bill.charges])

  // Ajakan donasi muncul setelah struk selesai dibagikan, bukan saat pengguna masih menghitung.
  const onPrintOpenChange = (open: boolean) => {
    setPrintOpen(open)
    // Tunggu animasi tutup halaman struk supaya dua sheet tidak bertumpuk.
    if (!open && donation.shouldAsk()) {
      setDonationMounted(true)
      setTimeout(() => openDonation(false), 400)
    }
  }

  // Ajakan bertimer sekali per isi tagihan, beberapa detik setelah Hasil tampil. Batal kalau
  // pengguna keburu pindah langkah atau membuka struk.
  const peeked = useRef('')
  useEffect(() => {
    if (step !== LAST_STEP || printOpen || askDonation) return
    if (billKey === peeked.current || !donation.shouldPeek()) return
    const t = setTimeout(() => {
      peeked.current = billKey
      openDonation(true)
    }, PEEK_DELAY_MS)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, printOpen, askDonation])

  // Maju hanya kalau syarat langkahnya terpenuhi; pesan kesalahan tampil sebagai toast.
  const tryGo = (to: number) => {
    const msg = to > step ? stepBlocker(to, bill, result) : null
    if (msg) return toast.warning(msg)
    go(to)
  }

  // Confetti sekali per isi tagihan, bukan setiap kali bolak-balik ke Hasil.
  const celebrated = useRef('')
  useEffect(() => {
    if (step !== LAST_STEP) return
    if (billKey === celebrated.current) return
    celebrated.current = billKey
    donation.countBill(billKey)
    void celebrate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  const isEmpty = !bill.title && bill.people.length === 0 && bill.items.length === 0

  // Langsung dikosongkan tanpa konfirmasi; salah pencet cukup diurungkan dari toast.
  const reset = () => {
    const prev = { bill, step }
    dispatch({ type: 'reset' })
    go(0)
    toast('Tagihan dikosongkan', {
      duration: 6000,
      action: {
        label: 'Urungkan',
        onClick: () => {
          dispatch({ type: 'replace', bill: prev.bill })
          go(prev.step)
        },
      },
    })
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="grain relative mx-auto flex min-h-dvh max-w-lg flex-col">
        <AppHeader
          title={bill.title}
          onTitleChange={(title) => dispatch({ type: 'title', title })}
          onReset={reset}
          canReset={!isEmpty}
        >
          <StepNav step={step} onSelect={tryGo} />
        </AppHeader>

        <main className="relative z-10 flex-1 overflow-x-clip px-5 pt-4 pb-36">
          <AnimatePresence mode="popLayout" custom={dir} initial={false}>
            <motion.section
              key={step}
              custom={dir}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              {step === 0 && <PeopleStep bill={bill} dispatch={dispatch} />}
              {step === 1 && <ItemsStep bill={bill} result={result} dispatch={dispatch} />}
              {step === 2 && <ChargesStep bill={bill} result={result} dispatch={dispatch} />}
              {step === 3 && <ResultStep bill={bill} result={result} dispatch={dispatch} onDonate={donation.donated} />}
            </motion.section>
          </AnimatePresence>
        </main>

        <BottomBar
          step={step}
          subtotal={itemsSubtotal(bill.items)}
          total={result.total}
          onBack={() => go(step - 1)}
          onNext={() => tryGo(step + 1)}
          onShare={() => {
            setPrintMounted(true)
            setPrintOpen(true)
          }}
        />
      </div>

      {printMounted && (
        <Suspense fallback={null}>
          <PrintSheet open={printOpen} onOpenChange={onPrintOpenChange} bill={bill} result={result} />
        </Suspense>
      )}

      {donationMounted && (
        <Suspense fallback={null}>
          <DonationSheet
            open={askDonation}
            autoCloseSeconds={donationTimed ? PEEK_SECONDS : undefined}
            onDismiss={() => {
              setAskDonation(false)
              if (!donationTimed) donation.dismiss()
            }}
            onDonate={() => {
              setAskDonation(false)
              donation.donated()
            }}
          />
        </Suspense>
      )}

      <AppToaster />
    </MotionConfig>
  )
}
