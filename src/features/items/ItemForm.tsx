import { AnimatePresence, motion } from 'motion/react'
import { Check, Minus, Plus, Trash2, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { Bill, Item } from '../../domain/bill'
import { rupiah } from '../../lib/format'
import { Avatar, Button, MoneyInput } from '../../ui'

export function ItemForm({
  initial,
  bill,
  isNew,
  onSave,
  onSaveAndAddAnother,
  onDelete,
  onChange,
}: {
  initial: Item
  bill: Bill
  isNew: boolean
  onSave: (i: Item) => void
  /** Simpan lalu langsung kosongkan form untuk menu berikutnya tanpa menutup sheet. */
  onSaveAndAddAnother: (i: Item) => void
  onDelete: () => void
  /** Isian terakhir, supaya tidak hilang kalau sheet tertutup sebelum disimpan. */
  onChange: (i: Item) => void
}) {
  const [item, setItem] = useState(initial)
  useEffect(() => onChange(item), [item, onChange])
  const set = (patch: Partial<Item>) => setItem((i) => ({ ...i, ...patch }))
  const allSelected = bill.people.length > 0 && bill.people.every((p) => item.sharedBy.includes(p.id))
  const togglePerson = (id: string) =>
    set({ sharedBy: item.sharedBy.includes(id) ? item.sharedBy.filter((x) => x !== id) : [...item.sharedBy, id] })

  const problem = !item.name.trim()
    ? 'Nama menunya diisi dulu ya'
    : !item.price
      ? 'Harganya belum diisi'
      : item.sharedBy.length === 0
        ? 'Pilih minimal satu orang yang pesan'
        : null

  const submit = (save: (i: Item) => void) => {
    if (problem) return toast.error(problem, { position: 'top-center' })
    save({ ...item, name: item.name.trim() })
    if (isNew) toast.success(`${item.name.trim()} ditambahkan`, { position: 'top-center' })
  }

  return (
    <div className="space-y-5 pb-2">
      {/* Label kecil di dalam kotak, sama seperti label Subtotal/Total di bar bawah, supaya tetap terlihat setelah diisi. */}
      <label className="block rounded-2xl bg-surface-2 px-4 pt-2.5 pb-3 ring-ink/80 transition focus-within:ring-2">
        <span className="block text-[11px] font-semibold text-muted">Nama menu</span>
        <input
          value={item.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="mis. Nasi Goreng"
          // eslint-disable-next-line jsx-a11y/no-autofocus -- fokus ke field pertama saat sheet pesanan baru dibuka
          autoFocus={isNew}
          className="w-full bg-transparent text-lg font-semibold outline-none placeholder:font-medium placeholder:text-muted"
        />
      </label>

      <div className="flex gap-3">
        <MoneyInput label="Harga satuan" showLabel value={item.price} onChange={(price) => set({ price })} className="flex-1" />
        <div className="flex flex-col rounded-2xl bg-surface-2 px-1.5 pt-2.5 pb-1.5">
          {/* Tombolnya sudah bernama "Kurangi/Tambah jumlah", jadi label ini cukup untuk mata. */}
          <span className="px-2.5 text-[11px] font-semibold text-muted" aria-hidden>
            Jumlah
          </span>
          <div className="flex flex-1 items-center gap-1">
            <motion.button whileTap={{ scale: 0.85 }} onClick={() => set({ qty: Math.max(1, item.qty - 1) })} className="grid size-10 place-items-center rounded-xl bg-surface" aria-label="Kurangi jumlah">
              <Minus size={16} />
            </motion.button>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={item.qty}
                initial={{ y: -12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 12, opacity: 0 }}
                className="w-7 text-center font-bold tabular-nums"
              >
                {item.qty}
              </motion.span>
            </AnimatePresence>
            <motion.button whileTap={{ scale: 0.85 }} onClick={() => set({ qty: item.qty + 1 })} className="grid size-10 place-items-center rounded-xl bg-surface" aria-label="Tambah jumlah">
              <Plus size={16} />
            </motion.button>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold">Siapa yang pesan?</p>
          <button
            onClick={() => set({ sharedBy: allSelected ? [] : bill.people.map((p) => p.id) })}
            aria-pressed={allSelected}
            className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-bold transition-colors ${allSelected ? 'bg-ink text-bg' : 'bg-surface-2'}`}
          >
            <Users size={13} /> Semua
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {bill.people.map((p) => {
            const on = item.sharedBy.includes(p.id)
            return (
              <motion.button
                key={p.id}
                whileTap={{ scale: 0.92 }}
                onClick={() => togglePerson(p.id)}
                aria-pressed={on}
                animate={{ backgroundColor: on ? p.color : 'var(--surface-2)' }}
                className="flex items-center gap-2 rounded-full py-1.5 pr-4 pl-1.5 text-sm font-semibold"
                style={{ color: on ? '#141414' : undefined }}
              >
                <Avatar name={p.name} color={p.color} size={28} />
                {p.name}
                {on && <Check size={14} strokeWidth={3} aria-hidden />}
              </motion.button>
            )
          })}
        </div>
        {item.sharedBy.length > 1 && item.price > 0 && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-3 text-sm text-muted">
            Masing-masing <b className="text-ink">{rupiah((item.price * item.qty) / item.sharedBy.length)}</b> sebelum pajak
          </motion.p>
        )}
      </div>

      <div className="space-y-1 pt-1">
        <div className="flex gap-2">
          {!isNew && (
            <Button variant="soft" onClick={onDelete} aria-label="Hapus pesanan" className="!px-4 text-coral">
              <Trash2 size={18} />
            </Button>
          )}
          <Button className="flex-1" onClick={() => submit(onSave)}>
            {isNew ? 'Tambahkan' : 'Simpan'} · {rupiah(item.price * item.qty)}
          </Button>
        </div>
        {isNew && (
          <Button variant="ghost" className="w-full !py-2.5 text-sm text-muted" onClick={() => submit(onSaveAndAddAnother)}>
            <Plus size={16} /> Simpan & tambah menu lain
          </Button>
        )}
      </div>
    </div>
  )
}
