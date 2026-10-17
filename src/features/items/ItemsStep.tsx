import { AnimatePresence, motion } from 'motion/react'
import { AlertCircle, Plus } from 'lucide-react'
import { lazy, Suspense, useCallback, useRef, useState, type Dispatch } from 'react'
import { toast } from 'sonner'
import { hasUnsavedChanges, type Bill, type Item } from '../../domain/bill'
import { itemsSubtotal, type BillResult } from '../../domain/calculate'
import { rupiah } from '../../lib/format'
import { uid } from '../../lib/id'
import type { Action } from '../../state/billReducer'
import { AnimatedRupiah, Avatar, Button, ReceiptIllustration, SectionTitle, WorriedReceiptIllustration } from '../../ui'
import { ItemForm } from './ItemForm'

// Bottom sheet (Vaul + Radix) baru dimuat saat langkah Pesanan dibuka.
const Sheet = lazy(() => import('../../ui/Sheet').then((m) => ({ default: m.Sheet })))

const blank = (): Item => ({ id: uid(), name: '', price: 0, qty: 1, sharedBy: [] })

export function ItemsStep({ bill, result, dispatch }: { bill: Bill; result: BillResult; dispatch: Dispatch<Action> }) {
  const [draft, setDraft] = useState<Item | null>(null)
  const [open, setOpen] = useState(false)
  // Isian form terakhir, dan pesanan baru yang belum disimpan saat sheet tertutup. Tombol Tambah pesanan
  // melanjutkannya, jadi isian tidak hilang walau sheet tertutup tanpa sengaja.
  const latest = useRef<Item | null>(null)
  const [unsaved, setUnsaved] = useState<Item | null>(null)
  const people = new Map(bill.people.map((p) => [p.id, p]))
  const subtotal = itemsSubtotal(bill.items)

  const edit = (item: Item) => {
    setDraft(item)
    latest.current = item
    setOpen(true)
  }
  const onFormChange = useCallback((item: Item) => void (latest.current = item), [])

  // Dipanggil hanya saat pengguna menutup sheet (geser, tombol tutup, ketuk di luar, Escape), bukan setelah disimpan.
  const close = (o: boolean) => {
    setOpen(o)
    const current = latest.current
    if (o || !draft || !current) return
    const saved = bill.items.find((i) => i.id === draft.id)
    if (!saved) setUnsaved(hasUnsavedChanges(undefined, current) ? current : null)
    if (!hasUnsavedChanges(saved, current)) return
    toast(saved ? 'Perubahan belum disimpan' : 'Pesanan belum disimpan', {
      description: 'Isiannya masih ada.',
      action: { label: 'Lanjutkan', onClick: () => edit(current) },
    })
  }

  const saved = (item: Item) => {
    dispatch({ type: 'upsertItem', item })
    if (item.id === unsaved?.id) setUnsaved(null)
  }

  const remove = (id: string) => {
    const index = bill.items.findIndex((i) => i.id === id)
    const item = bill.items[index]
    dispatch({ type: 'removeItem', id })
    setOpen(false)
    toast(`${item.name || 'Pesanan'} dihapus`, {
      action: { label: 'Urungkan', onClick: () => dispatch({ type: 'restoreItem', item, index }) },
    })
  }

  return (
    <div>
      <SectionTitle eyebrow="Langkah 2" title={<>Pesan <span className="font-serif font-normal whitespace-nowrap italic">apa aja?</span></>}>
        Satu menu bisa dibagi ke beberapa orang, harganya otomatis dibagi rata.
      </SectionTitle>

      {/* Pesanan tanpa pemilik menahan langkah Pajak, jadi alasannya ditampilkan sebelum pengguna menekan Lanjut. */}
      <AnimatePresence initial={false}>
        {result.unassigned > 0 && (
          <motion.div
            key="unassigned"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <output className="mb-3 flex items-center gap-3 rounded-[1.4rem] bg-coral/10 py-2.5 pr-4 pl-2.5">
              <WorriedReceiptIllustration className="w-14 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-balance">{result.unassigned} pesanan belum ada yang pesan</p>
                <p className="mt-0.5 text-xs text-pretty text-muted">Ketuk menunya, lalu pilih siapa yang pesan.</p>
              </div>
            </output>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="popLayout" initial={false}>
        {bill.items.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center pt-2 pb-6 text-center"
          >
            <ReceiptIllustration className="w-60" />
            <p className="mt-2 font-semibold">Struknya masih kosong</p>
            <p className="mt-1 max-w-60 text-sm text-muted">Tambahin menu satu-satu sesuai struk, lalu pilih siapa yang pesan.</p>
          </motion.div>
        ) : (
          <motion.ul key="list" layout className="space-y-2.5">
            <AnimatePresence mode="popLayout">
              {bill.items.map((item) => {
                const owners = item.sharedBy.map((id) => people.get(id)).filter((p) => !!p)
                return (
                  <motion.li
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -60, transition: { duration: 0.2 } }}
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  >
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={() => edit(item)}
                      className="flex w-full items-center gap-3 rounded-[1.4rem] bg-surface p-4 text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{item.name || 'Tanpa nama'}</p>
                        <p className="mt-0.5 text-sm text-muted tabular-nums">
                          {item.qty} × {rupiah(item.price)}
                        </p>
                        <div className="mt-2.5 flex items-center">
                          {owners.length === 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-coral/15 px-2.5 py-1 text-xs font-semibold text-coral">
                              <AlertCircle size={13} /> Belum ada yang pesan
                            </span>
                          ) : (
                            <>
                              <div className="flex -space-x-2">
                                {owners.slice(0, 5).map((p) => (
                                  <span key={p.id} className="inline-flex rounded-full ring-2 ring-surface">
                                    <Avatar name={p.name} color={p.color} size={26} />
                                  </span>
                                ))}
                              </div>
                              <span className="ml-2 truncate text-xs font-medium text-muted">
                                {owners.length > 1 ? `dibagi ${owners.length}` : owners[0].name}
                              </span>
                              {owners.length > 1 && <span className="sr-only">{owners.map((p) => p.name).join(', ')}</span>}
                            </>
                          )}
                        </div>
                      </div>
                      <p className="shrink-0 font-bold tabular-nums">{rupiah(item.price * item.qty)}</p>
                    </motion.button>
                  </motion.li>
                )
              })}
            </AnimatePresence>
          </motion.ul>
        )}
      </AnimatePresence>

      {bill.items.length > 0 && (
        <motion.div layout className="mt-4 flex items-center justify-between rounded-[1.4rem] border border-dashed border-line px-5 py-4">
          <span className="text-sm font-medium text-muted">Subtotal ({bill.items.length} menu)</span>
          <AnimatedRupiah value={subtotal} className="font-bold" />
        </motion.div>
      )}

      <Button variant="soft" className="mt-4 w-full border-2 border-dashed border-line !bg-transparent" onClick={() => edit(unsaved ?? blank())}>
        <Plus size={18} /> Tambah pesanan
      </Button>

      <Suspense fallback={null}>
        <Sheet
          open={open}
          onOpenChange={close}
          title={bill.items.some((i) => i.id === draft?.id) ? 'Ubah pesanan' : 'Pesanan baru'}
        >
          {draft && (
            <ItemForm
              key={draft.id}
              initial={draft}
              bill={bill}
              isNew={!bill.items.some((i) => i.id === draft.id)}
              onSave={(item) => {
                saved(item)
                setOpen(false)
              }}
              onSaveAndAddAnother={(item) => {
                saved(item)
                edit(blank())
              }}
              onDelete={() => remove(draft.id)}
              onChange={onFormChange}
            />
          )}
        </Sheet>
      </Suspense>
    </div>
  )
}
